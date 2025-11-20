import pandas as pd
from django.core.management.base import BaseCommand
from dckv.models import DeviceReading
from datetime import datetime
from django.utils.timezone import make_aware


class Command(BaseCommand):
    help = "Import client DCKV Excel log data"

    def add_arguments(self, parser):
        parser.add_argument("file_path", type=str, help="Path to Excel file")

    def handle(self, *args, **options):
        file_path = options["file_path"]
        print(f"Reading Excel: {file_path}")

        # READ FILE (skip top metadata rows)
        df = pd.read_excel(file_path, skiprows=2)

        # NORMALIZE COLUMNS
        df.columns = (
            df.columns.str.strip()
            .str.lower()
            .str.replace(" ", "_")
            .str.replace('"', "")
        )

        # DEBUG
        print("Cleaned Columns:", df.columns.tolist())

        # RENAME BASED ON CLIENT FORMAT
        df = df.rename(columns={
            "start": "start_time",
            "end": "end_time",
            "energy_consumption": "energy_cum",
        })

        # VALIDATE REQUIRED FIELDS
        required = ["hotel_id", "kitchen_id", "date", "start_time", "end_time", "mid_hid", "energy_cum"]
        missing = [col for col in required if col not in df.columns]

        if missing:
            print(f"❌ Missing required columns: {missing}")
            return

        count = 0

        for _, row in df.iterrows():
            date_str = str(row["date"])
            start = str(row["start_time"])
            end = str(row["end_time"])

            try:
                # Parse full datetime
                dt_start = make_aware(datetime.strptime(f"{date_str} {start}", "%d-%m-%Y %H:%M"))
                dt_end = make_aware(datetime.strptime(f"{date_str} {end}", "%d-%m-%Y %H:%M"))
            except Exception as e:
                print("❌ Date parse failed:", row["date"], row["start_time"], e)
                continue

            # INSERT DATA
            DeviceReading.objects.update_or_create(
                hotel_id=row["hotel_id"],
                kitchen_id=row["kitchen_id"],
                mid_hid=row["mid_hid"],
                datetime_end=dt_end,
                defaults={
                    "date": dt_end.date(),
                    "temperature": row.get("temperature"),
                    "smoke": row.get("smoke"),
                    "damper": row.get("damper_pos"),
                    "exhaust": row.get("exhaust_speed"),
                    "voltage": row.get("mains_voltage"),
                    "energy_cum": float(row.get("energy_cum", 0)),
                },
            )

            count += 1

        print(f"\n✔ Imported {count} records successfully!")
