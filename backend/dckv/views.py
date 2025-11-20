# from rest_framework.decorators import api_view
# from rest_framework.response import Response
# from rest_framework import status
# from django.utils.dateparse import parse_date
# from django.db.models import F
# from django.shortcuts import get_object_or_404
# from datetime import datetime, date, time, timedelta
# from .models import DeviceReading, Benchmark
# from .serializers import DeviceReadingSerializer, BenchmarkSerializer
# from .auth import USERS, create_jwt, verify_jwt
# import json

# # ---------- LOGIN ----------
# @api_view(["POST"])
# def login_view(request):
#     username = request.data.get("username")
#     password = request.data.get("password")
#     if username in USERS and USERS[username] == password:
#         token = create_jwt(username)
#         return Response({"success": True, "token": token, "username": username})
#     return Response({"success": False, "message": "Invalid credentials"}, status=400)

# # ---------- INGEST ----------
# @api_view(["POST"])
# def ingest_view(request):
#     """
#     Expects payload as described in spec:
#     D1 .. D15 in JSON keys
#     """
#     data = request.data
#     try:
#         # parse values (be defensive with missing formats)
#         hotel = int(data.get("D1"))
#         kitchen = int(data.get("D2"))
#         # D3 is date in DD:MM:YYYY (spec shows weird order; example earlier)
#         # Accept either ISO or DD:MM:YYYY
#         raw_d3 = data.get("D3")
#         parsed_date = None
#         if raw_d3:
#             # try DD:MM:YYYY
#             try:
#                 parsed_date = datetime.strptime(raw_d3, "%d:%m:%Y").date()
#             except Exception:
#                 # try ISO
#                 try:
#                     parsed_date = parse_date(raw_d3)
#                 except Exception:
#                     parsed_date = date.today()
#         else:
#             parsed_date = date.today()

#         # Times are strings HH:MM:SS
#         start_time = None
#         end_time = None
#         if data.get("D4"):
#             try:
#                 start_time = datetime.strptime(data.get("D4"), "%H:%M:%S").time()
#             except:
#                 # maybe HH:MM
#                 start_time = datetime.strptime(data.get("D4"), "%H:%M").time()
#         if data.get("D5"):
#             try:
#                 end_time = datetime.strptime(data.get("D5"), "%H:%M:%S").time()
#             except:
#                 end_time = datetime.strptime(data.get("D5"), "%H:%M").time()

#         midhid = int(data.get("D6"))
#         temperature = try_float(data.get("D7"))
#         smoke = try_float(data.get("D8"))
#         damper = try_float(data.get("D9"))
#         exhaust = try_float(data.get("D10"))
#         mains = try_float(data.get("D11"))
#         energy_cum = try_float(data.get("D12"))
#         logid = try_int(data.get("D13"))
#         r1 = try_int(data.get("D14"))
#         r2 = try_int(data.get("D15"))

#         # compute datetime_end
#         datetime_end = None
#         if parsed_date and end_time:
#             datetime_end = datetime.combine(parsed_date, end_time)

#         reading = DeviceReading.objects.create(
#             hotel_id=hotel,
#             kitchen_id=kitchen,
#             date=parsed_date,
#             start_time=start_time,
#             end_time=end_time,
#             mid_hid=midhid,
#             temperature=temperature,
#             smoke=smoke,
#             damper_pos=damper,
#             exhaust_speed=exhaust,
#             mains_voltage=mains,
#             energy_cum=energy_cum,
#             log_id=logid,
#             reserve1=r1,
#             reserve2=r2,
#             datetime_end=datetime_end
#         )
#         return Response({"code":200, "message":"Data stored successfully"})
#     except Exception as e:
#         return Response({"code":500, "message":f"Data not stored: {str(e)}"}, status=500)


# def try_float(v):
#     try:
#         if v is None or v == "":
#             return None
#         return float(v)
#     except:
#         return None

# def try_int(v):
#     try:
#         if v is None or v == "":
#             return None
#         return int(v)
#     except:
#         return None

# # ---------- HOODS LIST ----------
# @api_view(["GET"])
# def hoods_list(request):
#     """
#     Query params:
#      - hotel_id (optional)
#      - kitchen_id (optional)
#     Returns dynamic hood list (distinct mid_hid except master maybe)
#     Always include Master (MID must be known, e.g., 11). We'll include distinct mid_hid
#     """
#     hotel_id = request.query_params.get("hotel_id")
#     kitchen_id = request.query_params.get("kitchen_id")
#     qs = DeviceReading.objects.all()
#     if hotel_id:
#         qs = qs.filter(hotel_id=int(hotel_id))
#     if kitchen_id:
#         qs = qs.filter(kitchen_id=int(kitchen_id))
#     mids = qs.values_list("mid_hid", flat=True).distinct()
#     mids = sorted(list(mids))
#     # Optionally map names (you can return objects with id and label)
#     return Response({"hoods": [{"id": m, "label": ("Master" if m==11 else f"Hood {m}")} for m in mids]})

# # ---------- GET CHART DATA ----------
# @api_view(["GET"])
# def chart_data(request):
#     """
#     params:
#       mid_hid (required)
#       date  (YYYY-MM-DD) required
#     returns JSON series depending on mid type (if mid is master use exhaust/energy/voltage, else hood metrics)
#     """
#     mid = request.query_params.get("mid_hid")
#     date_s = request.query_params.get("date")
#     if not mid or not date_s:
#         return Response({"error":"mid_hid and date required"}, status=400)
#     mid = int(mid)
#     the_date = parse_date(date_s)
#     if the_date is None:
#         return Response({"error":"invalid date"}, status=400)

#     readings = list(DeviceReading.objects.filter(mid_hid=mid, date=the_date).order_by("datetime_end"))
#     # prepare series depending on mid type
#     if mid == 11:
#         # master: Exhaust Speed, Energy Consumption, Voltage
#         xs = []
#         exhaust_series = []
#         energy_series = []
#         volts_series = []
#         prev_energy = None
#         for r in readings:
#             label = r.datetime_end.strftime("%H:%M") if r.datetime_end else ""
#             xs.append(label)
#             exhaust_series.append(r.exhaust_speed if r.exhaust_speed is not None else 0)
#             volts_series.append(r.mains_voltage if r.mains_voltage is not None else 0)
#             # energy: compute delta cumulative
#             if r.energy_cum is not None:
#                 if prev_energy is None:
#                     # can't compute delta for first point — assume 0 for interval
#                     delta = 0
#                 else:
#                     delta = max(0.0, r.energy_cum - prev_energy)
#                 energy_series.append(delta)
#                 prev_energy = r.energy_cum
#             else:
#                 energy_series.append(0)
#         return Response({
#             "x": xs,
#             "exhaust": exhaust_series,
#             "energy": energy_series,
#             "voltage": volts_series
#         })
#     else:
#         # Hood: Temperature, Smoke, Damper Position
#         xs = []
#         temp_series = []
#         smoke_series = []
#         damper_series = []
#         for r in readings:
#             label = r.datetime_end.strftime("%H:%M") if r.datetime_end else ""
#             xs.append(label)
#             temp_series.append(r.temperature if r.temperature is not None else 0)
#             smoke_series.append(r.smoke if r.smoke is not None else 0)
#             damper_series.append(r.damper_pos if r.damper_pos is not None else 0)
#         return Response({
#             "x": xs,
#             "temperature": temp_series,
#             "smoke": smoke_series,
#             "damper": damper_series
#         })

# # ---------- BENCHMARK SET/GET ----------
# @api_view(["POST"])
# def set_benchmark(request):
#     """
#     Body: hotel_id, kitchen_id, value (float), date optional (YYYY-MM-DD). 
#     Enforce one per day. If exists return error.
#     """
#     hotel = int(request.data.get("hotel_id"))
#     kitchen = int(request.data.get("kitchen_id"))
#     val = request.data.get("value")
#     d = request.data.get("date")
#     if d:
#         the_date = parse_date(d)
#     else:
#         the_date = date.today()
#     try:
#         val_f = float(val)
#     except:
#         return Response({"error":"Please enter numeric value"}, status=400)
#     exists = Benchmark.objects.filter(hotel_id=hotel, kitchen_id=kitchen, date=the_date).first()
#     if exists:
#         return Response({"error":"Benchmark already set for this date"}, status=400)
#     bm = Benchmark.objects.create(hotel_id=hotel, kitchen_id=kitchen, date=the_date, value_units_per_hour=val_f)
#     return Response({"message":"BENCH MARK Value has been saved successfully.", "benchmark": BenchmarkSerializer(bm).data})

# @api_view(["GET"])
# def get_benchmark(request):
#     """
#     Query: hotel_id, kitchen_id, date (optional)
#     Returns active benchmark for that date — if not set, carry forward most recent previous value.
#     """
#     hotel = int(request.query_params.get("hotel_id"))
#     kitchen = int(request.query_params.get("kitchen_id"))
#     d = request.query_params.get("date")
#     if d:
#         the_date = parse_date(d)
#     else:
#         the_date = date.today()

#     bm = Benchmark.objects.filter(hotel_id=hotel, kitchen_id=kitchen, date=the_date).first()
#     if bm:
#         return Response({"found": True, "benchmark": BenchmarkSerializer(bm).data})
#     # carry forward last earlier
#     prev = Benchmark.objects.filter(hotel_id=hotel, kitchen_id=kitchen, date__lt=the_date).order_by("-date").first()
#     if prev:
#         return Response({"found": False, "carried": True, "benchmark": BenchmarkSerializer(prev).data, "message":"No new BENCH MARK Value entered. Previous value carried forward."})
#     return Response({"found": False, "carried": False, "message":"No benchmark available."})

# # ---------- ENERGY SAVED ----------
# @api_view(["GET"])
# def energy_saved(request):
#     """
#     Query params:
#       hotel_id, kitchen_id, mid_hid, date (YYYY-MM-DD)
#       If date == today -> compute until now
#       Uses active benchmark value (carry forward if required). 
#       Calculation method:
#         - Use cumulative energy readings (energy_cum) and compute delta between consecutive readings.
#         - Sum deltas in each hour (or for the full day)
#         - For each hour, benchmark_energy = benchmark_value * 1 (units)
#         - Energy saved = sum(benchmark_energy) - sum(actual_energy)
#     """
#     hotel = int(request.query_params.get("hotel_id"))
#     kitchen = int(request.query_params.get("kitchen_id"))
#     mid = int(request.query_params.get("mid_hid"))
#     d = request.query_params.get("date")
#     if d is None:
#         return Response({"error":"date required"}, status=400)
#     the_date = parse_date(d)
#     if the_date is None:
#         return Response({"error":"invalid date"}, status=400)

#     # get active benchmark
#     bm_obj = Benchmark.objects.filter(hotel_id=hotel, kitchen_id=kitchen, date=the_date).first()
#     if not bm_obj:
#         prev = Benchmark.objects.filter(hotel_id=hotel, kitchen_id=kitchen, date__lt=the_date).order_by("-date").first()
#         if prev:
#             bm_value = prev.value_units_per_hour
#         else:
#             # fallback: try compute from readings where exhaust==100% (for master)
#             bm_value = infer_benchmark_from_data(hotel, kitchen, mid, the_date)
#     else:
#         bm_value = bm_obj.value_units_per_hour

#     # fetch readings for the date (filter up to now if today's date)
#     qs = DeviceReading.objects.filter(hotel_id=hotel, kitchen_id=kitchen, mid_hid=mid, date=the_date).order_by("datetime_end")
#     if the_date == date.today():
#         # up to now: allow readings with datetime_end <= now
#         qs = qs.filter(datetime_end__lte=datetime.now())

#     readings = list(qs)
#     if not readings:
#         return Response({"error":"No readings for this selection"}, status=404)

#     # compute delta cumulative per reading
#     # delta_i = reading[i].energy_cum - reading[i-1].energy_cum
#     deltas = []
#     prev_cum = None
#     for r in readings:
#         if r.energy_cum is None:
#             deltas.append(0)
#         else:
#             if prev_cum is None:
#                 deltas.append(0.0)
#             else:
#                 delta = max(0.0, r.energy_cum - prev_cum)
#                 deltas.append(delta)
#             prev_cum = r.energy_cum

#     # associate deltas with reading datetime_end and accumulate per hour
#     # We'll sum total_actual_energy = sum(deltas)
#     total_actual = sum(deltas)

#     # Determine hours covered
#     # For active period (start of first reading to last reading)
#     dt_start = readings[0].datetime_end
#     dt_end = readings[-1].datetime_end
#     # number of full hours (or partial) between start and end
#     hours = (dt_end - dt_start).total_seconds() / 3600.0
#     # But per requirement calculation uses how many hours have passed since start of device logs until now (or end)
#     # We'll compute total hours as ceiling of hours or use actual fractional hours
#     total_hours = max( ( (datetime.combine(the_date, datetime.max.time()) if the_date != date.today() else datetime.now()) - dt_start ).total_seconds() / 3600.0, 0.0)

#     # Simpler approach: compute benchmark energy for the period as bm_value * actual_hours_covered
#     # For accuracy, compute hours_covered as sum of deltas intervals -> there's 4 readings per hour. But we already have total_actual measured.
#     # Benchmark energy for the same interval = bm_value * total_hours_covered
#     # We'll compute hours_covered from time difference between first and last reading (in hours)
#     # If only instantaneous readings, better to compute using cumulative timestamps; use delta_count*(15/60)
#     # We'll compute hours_covered as number_of_intervals * 0.25 (since readings every 15 min)
#     interval_count = len(readings)  # note first interval has 0 delta, but intervals = len(readings)-1
#     hours_covered = max(0.0, (interval_count - 1) * 0.25)  # since deltas correspond to intervals

#     benchmark_energy_total = bm_value * hours_covered
#     energy_saved_value = max(0.0, benchmark_energy_total - total_actual)

#     return Response({
#         "benchmark_value_units_per_hour": bm_value,
#         "hours_covered": hours_covered,
#         "benchmark_energy_total": round(benchmark_energy_total, 4),
#         "actual_energy_total": round(total_actual, 4),
#         "energy_saved": round(energy_saved_value, 4),
#     })

# def infer_benchmark_from_data(hotel, kitchen, mid, the_date):
#     """
#     Heuristic: find readings where exhaust_speed == 100% and compute average energy delta per hour.
#     """
#     qs = DeviceReading.objects.filter(hotel_id=hotel, kitchen_id=kitchen, mid_hid=mid, date=the_date, exhaust_speed=100).order_by("datetime_end")
#     prev = None
#     deltas = []
#     for r in qs:
#         if r.energy_cum is None:
#             continue
#         if prev is None:
#             prev = r.energy_cum
#             continue
#         delta = max(0.0, r.energy_cum - prev)
#         deltas.append(delta)
#         prev = r.energy_cum
#     if not deltas:
#         # fallback to 1 unit/hour
#         return 1.0
#     # deltas are per-interval (likely 15-min) so convert to units/hour
#     avg_per_interval = sum(deltas) / len(deltas)
#     units_per_hour = avg_per_interval * 4.0
#     return units_per_hour

# # ---------- DOWNLOAD REPORT ----------
# @api_view(["GET"])
# def download_report(request):
#     """
#     download CSV for mid/date
#     query: hotel_id, kitchen_id, mid_hid, date
#     """
#     import csv
#     from django.http import HttpResponse

#     hotel = int(request.query_params.get("hotel_id"))
#     kitchen = int(request.query_params.get("kitchen_id"))
#     mid = int(request.query_params.get("mid_hid"))
#     d = request.query_params.get("date")
#     the_date = parse_date(d)
#     qs = DeviceReading.objects.filter(hotel_id=hotel, kitchen_id=kitchen, mid_hid=mid, date=the_date).order_by("datetime_end")

#     response = HttpResponse(content_type='text/csv')
#     response['Content-Disposition'] = f'attachment; filename="report_{mid}_{the_date}.csv"'
#     writer = csv.writer(response)
#     writer.writerow(["datetime_end","start_time","end_time","temperature","smoke","damper","exhaust","voltage","energy_cum"])
#     for r in qs:
#         writer.writerow([
#             r.datetime_end.isoformat() if r.datetime_end else "",
#             r.start_time.isoformat() if r.start_time else "",
#             r.end_time.isoformat() if r.end_time else "",
#             r.temperature, r.smoke, r.damper_pos, r.exhaust_speed, r.mains_voltage, r.energy_cum
#         ])
#     return response


from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_date
from django.db.models import F
from django.shortcuts import get_object_or_404
from datetime import datetime, date, time, timedelta
from .models import DeviceReading, Benchmark
from .serializers import DeviceReadingSerializer, BenchmarkSerializer
from .auth import USERS, create_jwt, verify_jwt
import json

# ---------- LOGIN ----------
@api_view(["POST"])
def login_view(request):
    username = request.data.get("username")
    password = request.data.get("password")
    if username in USERS and USERS[username] == password:
        token = create_jwt(username)
        return Response({"success": True, "token": token, "username": username})
    return Response({"success": False, "message": "Invalid credentials"}, status=400)

# ---------- INGEST ----------
@api_view(["POST"])
def ingest_view(request):
    """
    Expects payload as described in spec:
    D1 .. D15 in JSON keys
    """
    data = request.data
    try:
        # parse values (be defensive with missing formats)
        hotel = int(data.get("D1"))
        kitchen = int(data.get("D2"))
        # D3 is date in DD:MM:YYYY (spec shows weird order; example earlier)
        # Accept either ISO or DD:MM:YYYY
        raw_d3 = data.get("D3")
        parsed_date = None
        if raw_d3:
            # try DD:MM:YYYY
            try:
                parsed_date = datetime.strptime(raw_d3, "%d:%m:%Y").date()
            except Exception:
                # try ISO
                try:
                    parsed_date = parse_date(raw_d3)
                except Exception:
                    parsed_date = date.today()
        else:
            parsed_date = date.today()

        # Times are strings HH:MM:SS
        start_time = None
        end_time = None
        if data.get("D4"):
            try:
                start_time = datetime.strptime(data.get("D4"), "%H:%M:%S").time()
            except:
                # maybe HH:MM
                start_time = datetime.strptime(data.get("D4"), "%H:%M").time()
        if data.get("D5"):
            try:
                end_time = datetime.strptime(data.get("D5"), "%H:%M:%S").time()
            except:
                end_time = datetime.strptime(data.get("D5"), "%H:%M").time()

        midhid = int(data.get("D6"))
        temperature = try_float(data.get("D7"))
        smoke = try_float(data.get("D8"))
        damper = try_float(data.get("D9"))
        exhaust = try_float(data.get("D10"))
        mains = try_float(data.get("D11"))
        energy_cum = try_float(data.get("D12"))
        logid = try_int(data.get("D13"))
        r1 = try_int(data.get("D14"))
        r2 = try_int(data.get("D15"))

        # compute datetime_end
        datetime_end = None
        if parsed_date and end_time:
            datetime_end = datetime.combine(parsed_date, end_time)

        reading = DeviceReading.objects.create(
            hotel_id=hotel,
            kitchen_id=kitchen,
            date=parsed_date,
            start_time=start_time,
            end_time=end_time,
            mid_hid=midhid,
            temperature=temperature,
            smoke=smoke,
            damper_pos=damper,
            exhaust_speed=exhaust,
            mains_voltage=mains,
            energy_cum=energy_cum,
            log_id=logid,
            reserve1=r1,
            reserve2=r2,
            datetime_end=datetime_end
        )
        return Response({"code": 200, "message": "Data stored successfully"})
    except Exception as e:
        return Response({"code": 500, "message": f"Data not stored: {str(e)}"}, status=500)


def try_float(v):
    try:
        if v is None or v == "":
            return None
        return float(v)
    except:
        return None


def try_int(v):
    try:
        if v is None or v == "":
            return None
        return int(v)
    except:
        return None

# ---------- HOODS LIST ----------
@api_view(["GET"])
def hoods_list(request):
    hotel_id = request.query_params.get("hotel_id")
    kitchen_id = request.query_params.get("kitchen_id")

    qs = DeviceReading.objects.all()

    if hotel_id:
        qs = qs.filter(hotel_id=int(hotel_id))
    if kitchen_id:
        qs = qs.filter(kitchen_id=int(kitchen_id))

    # DISTINCT mid_hid values
    mids = qs.values_list("mid_hid", flat=True).distinct().order_by("mid_hid")

    return Response({
        "hoods": [
            {"id": m, "label": "Master" if m == 11 else f"Hood {m}"}
            for m in mids
        ]
    })


# ---------- GET CHART DATA ----------
@api_view(["GET"])
def chart_data(request):
    """
    params:
      mid_hid (required)
      date  (YYYY-MM-DD) required
    returns JSON series depending on mid type (if mid is master use exhaust/energy/voltage, else hood metrics)
    """
    mid = request.query_params.get("mid_hid")
    date_s = request.query_params.get("date")
    if not mid or not date_s:
        return Response({"error": "mid_hid and date required"}, status=400)
    mid = int(mid)
    the_date = parse_date(date_s)
    if the_date is None:
        return Response({"error": "invalid date"}, status=400)

    readings = list(DeviceReading.objects.filter(mid_hid=mid, date=the_date).order_by("datetime_end"))
    # prepare series depending on mid type
    if mid == 11:
        # master: Exhaust Speed, Energy Consumption, Voltage
        xs = []
        exhaust_series = []
        energy_series = []
        volts_series = []
        prev_energy = None
        for r in readings:
            label = r.datetime_end.strftime("%H:%M") if r.datetime_end else ""
            xs.append(label)
            exhaust_series.append(r.exhaust_speed if r.exhaust_speed is not None else 0)
            volts_series.append(r.mains_voltage if r.mains_voltage is not None else 0)
            # energy: compute delta cumulative
            if r.energy_cum is not None:
                if prev_energy is None:
                    # can't compute delta for first point — assume 0 for interval
                    delta = 0
                else:
                    delta = max(0.0, r.energy_cum - prev_energy)
                energy_series.append(delta)
                prev_energy = r.energy_cum
            else:
                energy_series.append(0)
        return Response({
            "x": xs,
            "exhaust": exhaust_series,
            "energy": energy_series,
            "voltage": volts_series
        })
    else:
        # Hood: Temperature, Smoke, Damper Position
        xs = []
        temp_series = []
        smoke_series = []
        damper_series = []
        for r in readings:
            label = r.datetime_end.strftime("%H:%M") if r.datetime_end else ""
            xs.append(label)
            temp_series.append(r.temperature if r.temperature is not None else 0)
            smoke_series.append(r.smoke if r.smoke is not None else 0)
            damper_series.append(r.damper_pos if r.damper_pos is not None else 0)
        return Response({
            "x": xs,
            "temperature": temp_series,
            "smoke": smoke_series,
            "damper": damper_series
        })

# ---------- BENCHMARK SET/GET ----------
@api_view(["POST"])
def set_benchmark(request):
    """
    Body: hotel_id, kitchen_id, value (float), date optional (YYYY-MM-DD). 
    Enforce one per day. If exists return error.
    """
    hotel = int(request.data.get("hotel_id"))
    kitchen = int(request.data.get("kitchen_id"))
    val = request.data.get("value")
    d = request.data.get("date")
    if d:
        the_date = parse_date(d)
    else:
        the_date = date.today()
    try:
        val_f = float(val)
    except:
        return Response({"error": "Please enter numeric value"}, status=400)
    exists = Benchmark.objects.filter(hotel_id=hotel, kitchen_id=kitchen, date=the_date).first()
    if exists:
        return Response({"error": "Benchmark already set for this date"}, status=400)
    bm = Benchmark.objects.create(hotel_id=hotel, kitchen_id=kitchen, date=the_date, value_units_per_hour=val_f)
    return Response({"message": "BENCH MARK Value has been saved successfully.", "benchmark": BenchmarkSerializer(bm).data})


@api_view(["GET"])
def get_benchmark(request):
    """
    Query: hotel_id, kitchen_id, date (optional)
    Returns active benchmark for that date — if not set, carry forward most recent previous value.
    """
    hotel = int(request.query_params.get("hotel_id"))
    kitchen = int(request.query_params.get("kitchen_id"))
    d = request.query_params.get("date")
    if d:
        the_date = parse_date(d)
    else:
        the_date = date.today()

    bm = Benchmark.objects.filter(hotel_id=hotel, kitchen_id=kitchen, date=the_date).first()
    if bm:
        return Response({"found": True, "benchmark": BenchmarkSerializer(bm).data})
    # carry forward last earlier
    prev = Benchmark.objects.filter(hotel_id=hotel, kitchen_id=kitchen, date__lt=the_date).order_by("-date").first()
    if prev:
        return Response({"found": False, "carried": True, "benchmark": BenchmarkSerializer(prev).data,
                         "message": "No new BENCH MARK Value entered. Previous value carried forward."})
    return Response({"found": False, "carried": False, "message": "No benchmark available."})

# ---------- ENERGY SAVED ----------
@api_view(["GET"])
def energy_saved(request):
    hotel = int(request.query_params.get("hotel_id"))
    kitchen = int(request.query_params.get("kitchen_id"))
    mid = int(request.query_params.get("mid_hid"))
    d = request.query_params.get("date")

    the_date = parse_date(d)
    if not the_date:
        return Response({"error": "Invalid date"}, status=400)

    # get readings (NO HOTEL/KITCHEN FILTER TO PREVENT MISMATCH)
    readings = list(DeviceReading.objects.filter(
        mid_hid=mid,
        date=the_date
    ).order_by("datetime_end"))

    if not readings:
        return Response({"error": "No readings found for this date"}, status=404)

    # compute actual energy
    prev = None
    total_actual = 0
    for r in readings:
        if prev is not None and r.energy_cum is not None:
            total_actual += max(0, r.energy_cum - prev)
        prev = r.energy_cum

    # compute duration
    dt_start = readings[0].datetime_end
    dt_end = readings[-1].datetime_end
    duration_hours = round((dt_end - dt_start).total_seconds() / 3600, 2)

    # get benchmark
    bm_obj = Benchmark.objects.filter(date=the_date).first()
    bm = bm_obj.value_units_per_hour if bm_obj else 10  # default

    # compute energy saved
    expected = bm * duration_hours
    saved = expected - total_actual

    return Response({
        "duration_hours": duration_hours,
        "energy_consumed": round(total_actual, 2),
        "energy_saved": round(saved, 2),
        "benchmark": bm
    })


def infer_benchmark_from_data(hotel, kitchen, mid, the_date):
    """
    Heuristic: find readings where exhaust_speed == 100% and compute average energy delta per hour.
    """
    qs = DeviceReading.objects.filter(
        hotel_id=hotel,
        kitchen_id=kitchen,
        mid_hid=mid,
        date=the_date,
        exhaust_speed=100
    ).order_by("datetime_end")
    prev = None
    deltas = []
    for r in qs:
        if r.energy_cum is None:
            continue
        if prev is None:
            prev = r.energy_cum
            continue
        delta = max(0.0, r.energy_cum - prev)
        deltas.append(delta)
        prev = r.energy_cum
    if not deltas:
        # fallback to 1 unit/hour
        return 1.0
    # deltas are per-interval (likely 15-min) so convert to units/hour
    avg_per_interval = sum(deltas) / len(deltas)
    units_per_hour = avg_per_interval * 4.0
    return units_per_hour

# ---------- DOWNLOAD REPORT ----------
@api_view(["GET"])
def download_report(request):
    """
    download CSV for mid/date
    query: hotel_id, kitchen_id, mid_hid, date
    """
    import csv
    from django.http import HttpResponse

    hotel = int(request.query_params.get("hotel_id"))
    kitchen = int(request.query_params.get("kitchen_id"))
    mid = int(request.query_params.get("mid_hid"))
    d = request.query_params.get("date")
    the_date = parse_date(d)
    qs = DeviceReading.objects.filter(
        hotel_id=hotel,
        kitchen_id=kitchen,
        mid_hid=mid,
        date=the_date
    ).order_by("datetime_end")

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="report_{mid}_{the_date}.csv"'
    writer = csv.writer(response)
    writer.writerow(["datetime_end", "start_time", "end_time", "temperature", "smoke",
                    "damper", "exhaust", "voltage", "energy_cum"])
    for r in qs:
        writer.writerow([
            r.datetime_end.isoformat() if r.datetime_end else "",
            r.start_time.isoformat() if r.start_time else "",
            r.end_time.isoformat() if r.end_time else "",
            r.temperature, r.smoke, r.damper_pos, r.exhaust_speed,
            r.mains_voltage, r.energy_cum
        ])
    return response



from django.http import JsonResponse
from dckv.models import DeviceReading

def get_hoods(request, hotel_id, kitchen_id, date):
    entries = DeviceReading.objects.filter(
        hotel_id=hotel_id,
        kitchen_id=kitchen_id,
        date=date
    ).values("mid_hid").distinct()

    # If no data present → show only Master by default
    if not entries.exists():
        return JsonResponse({
            "hoods": [{"id": 11, "label": "Master"}]
        })

    hoods = []
    for item in entries:
        mid = item["mid_hid"]
        label = "Master" if mid == 11 else f"Hood {mid}"
        hoods.append({"id": mid, "label": label})

    return JsonResponse({"hoods": hoods})
