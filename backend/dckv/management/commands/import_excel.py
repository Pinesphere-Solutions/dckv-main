
# import pandas as pd
# from django.core.management.base import BaseCommand
# from dckv.models import DeviceReading
# from datetime import datetime

# class Command(BaseCommand):
#     help = "Import Excel Device Data"

#     def handle(self, *args, **kwargs):
#         file_path = "excel/device_sample_data.xlsx"

#         self.stdout.write(self.style.WARNING("Reading Excel..."))
#         df = pd.read_excel(file_path)

#         DeviceReading.objects.all().delete()  # OPTIONAL: clean old

#         for _, row in df.iterrows():
#             date_obj = datetime.strptime(row["D3"], "%d:%m:%Y").date()
#             end_t = datetime.strptime(row["D5"], "%H:%M:%S").time()

#             DeviceReading.objects.create(
#                 hotel_id=row["D1"],
#                 kitchen_id=row["D2"],
#                 date=date_obj,
#                 start_time=datetime.strptime(row["D4"], "%H:%M:%S").time(),
#                 end_time=end_t,
#                 mid_hid=row["D6"],
#                 temperature=row["D7"],
#                 smoke=row["D8"],
#                 damper_pos=row["D9"],
#                 exhaust_speed=row["D10"],
#                 mains_voltage=row["D11"],
#                 energy_cum=row["D12"],
#                 log_id=row["D13"],
#                 datetime_end=datetime.combine(date_obj, end_t)
#             )

#         print("✔ Imported Successfully")



import pandas as pd
from django.core.management.base import BaseCommand
from datetime import datetime
from dckv.models import DeviceReading


class Command(BaseCommand):
    help = "Import device sample data from Excel into DB (client header format)"

    def handle(self, *args, **kwargs):
        # Adjust this if your file name / path is different
        file_path = "excel/device_sample_data.xlsx"

        self.stdout.write(self.style.WARNING("Reading Excel..."))
        df = pd.read_excel(file_path)

        # --- Normalize column names (strip spaces, keep original case text) ---
        df.columns = [str(c).strip() for c in df.columns]

        # Try to detect the "Energy Consumption" column even if it has \n
        energy_col = None
        for c in df.columns:
            if "Energy" in c and "Consumption" in c:
                energy_col = c
                break

        if energy_col is None:
            self.stdout.write(self.style.ERROR("❌ Could not find an 'Energy Consumption' column."))
            self.stdout.write(self.style.ERROR(f"Columns found: {df.columns.tolist()}"))
            return

        rows_created = 0

        for _, row in df.iterrows():
            # Skip mapping row like: D1 / D2 / D3 ...
            date_val = row.get("DATE")
            if isinstance(date_val, str) and date_val.strip().startswith("D"):
                continue

            # Skip empty date rows
            if pd.isna(date_val):
                continue

            # --- Parse date ---
            try:
                # Expected format: 19-11-2025
                date_obj = datetime.strptime(str(date_val).strip(), "%d-%m-%Y").date()
            except Exception:
                # Fallback: let pandas try
                try:
                    date_obj = pd.to_datetime(date_val).date()
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Bad DATE value '{date_val}': {e}"))
                    continue

            # --- Parse times ---
            start_raw = str(row.get("START")).strip()
            end_raw = str(row.get("END")).strip()

            # Handle both HH:MM and HH:MM:SS
            def parse_time(val: str):
                for fmt in ("%H:%M", "%H:%M:%S"):
                    try:
                        return datetime.strptime(val, fmt).time()
                    except ValueError:
                        continue
                raise ValueError(f"time data '{val}' does not match HH:MM or HH:MM:SS")

            try:
                start_time = parse_time(start_raw)
                end_time = parse_time(end_raw)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Bad time START/END '{start_raw}' / '{end_raw}': {e}"))
                continue

            datetime_end = datetime.combine(date_obj, end_time)

            # --- Safe numeric helpers ---
            def to_float(v):
                try:
                    if pd.isna(v):
                        return None
                    return float(v)
                except Exception:
                    return None

            def to_int(v):
                try:
                    if pd.isna(v):
                        return None
                    return int(v)
                except Exception:
                    return None

            try:
                DeviceReading.objects.create(
                    hotel_id=to_int(row.get("HOTEL ID")) or 0,
                    kitchen_id=to_int(row.get("KITCHEN ID")) or 0,
                    date=date_obj,
                    start_time=start_time,
                    end_time=end_time,
                    mid_hid=to_int(row.get("MID_HID")) or 0,
                    temperature=to_float(row.get("Temperature")),
                    smoke=to_float(row.get("Smoke")),
                    damper_pos=to_float(row.get("Damper Pos")),
                    exhaust_speed=to_float(row.get("Exhaust Speed")),
                    mains_voltage=to_float(row.get("Mains Voltage")),
                    energy_cum=to_float(row.get(energy_col)),
                    log_id=to_int(row.get("LogID")),
                    reserve1=to_int(row.get("Reserve1")),
                    reserve2=to_int(row.get("Reserve2")),
                    datetime_end=datetime_end,
                )
                rows_created += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Row import failed: {e}"))
                continue

        self.stdout.write(self.style.SUCCESS(f"Successfully imported {rows_created} rows!"))
