
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



from datetime import datetime
from django.utils.dateparse import parse_date
from zoneinfo import ZoneInfo   
from rest_framework.decorators import api_view
from rest_framework.response import Response
from dckv.models import DeviceReading
from .models import Benchmark

IST = ZoneInfo("Asia/Kolkata")     # <--- Define IST timezone

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
        energy_interval = try_float(data.get("D14"))   # kWh per interval
        interval_minutes = try_float(data.get("D15"))  # minutes per interval


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
            energy_interval=energy_interval,
            interval_minutes=interval_minutes,
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
    mid = request.query_params.get("mid_hid")
    date_s = request.query_params.get("date")

    if not mid or not date_s:
        return Response({"error": "mid_hid and date required"}, status=400)

    mid = int(mid)
    the_date = parse_date(date_s)

    readings = list(DeviceReading.objects.filter(
        mid_hid=mid,
        date=the_date,
        datetime_end__isnull=False
    ).order_by("datetime_end"))

    if not readings:
        return Response({"error": "No data found"}, status=404)

    # ---------------- MASTER UNIT CHART ----------------
    if mid == 11:
        xs = []
        exhaust_series = []
        voltage_series = []
        energy_series = []   # cumulative energy!!

        for r in readings:
            dt_local = r.datetime_end.astimezone(IST)
            label = dt_local.strftime("%H:%M")
            xs.append(label)

            exhaust_series.append(r.exhaust_speed or 0)
            voltage_series.append(r.mains_voltage or 0)

            # ⭐ USE DIRECT CUMULATIVE ENERGY (not delta)
            energy_series.append(round(r.energy_cum or 0, 3))

        return Response({
            "x": xs,
            "exhaust": exhaust_series,
            "energy": energy_series,   # direct cumulative
            "voltage": voltage_series
        })



    # ---------------- HOOD UNIT CHART (no change) ----------------
    xs = []
    temp_series = []
    smoke_series = []
    damper_series = []

    for r in readings:
        dt_local = r.datetime_end.astimezone(IST)
        xs.append(dt_local.strftime("%H:%M"))

        temp_series.append(r.temperature or 0)
        smoke_series.append(r.smoke or 0)
        damper_series.append(r.damper_pos or 0)

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



# ---------- ENERGY SAVED (NEW LOGIC) ----------
@api_view(["GET"])
def energy_saved(request):
    hotel = int(request.query_params.get("hotel_id"))
    kitchen = int(request.query_params.get("kitchen_id"))
    mid = int(request.query_params.get("mid_hid"))
    d = request.query_params.get("date")

    the_date = parse_date(d)
    if not the_date:
        return Response({"error": "Invalid date"}, status=400)

    # Fetch all rows for this MID + date
    readings = list(DeviceReading.objects.filter(
        mid_hid=mid,
        date=the_date
    ).order_by("datetime_end"))

    if not readings:
        return Response({"error": "No readings found for this date"}, status=404)

    # ----------------------------------------
    # NEW LOGIC: SUM ENERGY INTERVALS (D14)
    # ----------------------------------------
    total_energy_consumed = 0
    for r in readings:
        if r.energy_interval:         # renamed from reserve1
            total_energy_consumed += float(r.energy_interval)

    total_energy_consumed = round(total_energy_consumed, 2)

    # ----------------------------------------
    # NEW LOGIC: SUM INTERVAL DURATION (D15)
    # ----------------------------------------
    total_minutes = 0
    for r in readings:
        if r.interval_minutes:        # renamed from reserve2
            total_minutes += float(r.interval_minutes)

    duration_hours = round(total_minutes / 60, 2)

    if duration_hours <= 0:
        return Response({"error": "Invalid duration"}, status=400)

    # ----------------------------------------
    # BENCHMARK (same logic as before)
    # ----------------------------------------
    bm_obj = Benchmark.objects.filter(
        hotel_id=hotel,
        kitchen_id=kitchen,
        date=the_date
    ).first()

    if bm_obj:
        bm = bm_obj.value_units_per_hour
    else:
        prev_bm = Benchmark.objects.filter(
            hotel_id=hotel,
            kitchen_id=kitchen,
            date__lt=the_date
        ).order_by("-date").first()
        bm = prev_bm.value_units_per_hour if prev_bm else infer_benchmark_from_data(hotel, kitchen, mid, the_date)

    # ----------------------------------------
    # ENERGY CONSUMPTION AS PER BENCHMARK
    # ----------------------------------------
    benchmark_energy = round(duration_hours * bm, 2)

    # ----------------------------------------
    # ENERGY SAVED
    # ----------------------------------------
    energy_saved = round(benchmark_energy - total_energy_consumed, 2)

    # ----------------------------------------
    # RESPONSE
    # ----------------------------------------
    return Response({
        "duration_hours": duration_hours,
        "energy_consumed": total_energy_consumed,
        "energy_saved": energy_saved,
        "benchmark": bm,
        "benchmark_energy": benchmark_energy
    })




# ---------- INFER BENCHMARK FROM DATA ----------
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
    ).values_list("mid_hid", flat=True).distinct()

    mids = sorted(entries)

    hoods = [{"id": 11}] + [{"id": mid} for mid in mids if mid != 11]

    return JsonResponse({"hoods": hoods})
