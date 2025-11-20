# from django.http import JsonResponse
# import random
# from datetime import datetime, timedelta


# def get_hoods(request):
#     """Returns 2 sample hoods"""
#     hoods = [
#         {"id": 11, "name": "Hood 1"},
#         {"id": 12, "name": "Hood 2"},
#     ]
#     return JsonResponse({"hoods": hoods})


# def get_dummy_device_data(hood_id, date_str):
#     """Generate realistic sample DCKV data"""

#     # Convert date from DD-MM-YYYY → datetime obj
#     date = datetime.strptime(date_str, "%d-%m-%Y")

#     data = []
#     start_time = datetime(date.year, date.month, date.day, 10, 0, 0)

#     for i in range(15):  # 15 logs for the graphs
#         t = start_time + timedelta(minutes=i * 1)

#         entry = {
#             "D1": 1001,
#             "D2": 1,
#             "D3": date_str,  
#             "D4": t.strftime("%H:%M:%S"),
#             "D5": (t + timedelta(minutes=1)).strftime("%H:%M:%S"),
#             "D6": hood_id,
#             "D7": round(random.uniform(30, 45), 1),   # Temperature
#             "D8": random.randint(10, 40),            # Smoke
#             "D9": random.randint(20, 100),           # Damper %
#             "D10": random.randint(40, 95),           # Exhaust Speed %
#             "D11": random.randint(215, 240),         # Voltage
#             "D12": round(random.uniform(2.5, 10.0), 2), # Energy consumption
#             "D13": random.randint(1000, 2000),       # Log ID
#             "D14": 0,
#             "D15": 0,
#         }

#         data.append(entry)

#     return data


# def get_data(request):
#     """Returns data for graphs for selected hood & date"""
#     hood_id = int(request.GET.get("hood_id"))
#     date = request.GET.get("date")  # DD-MM-YYYY

#     dummy_data = get_dummy_device_data(hood_id, date)

#     return JsonResponse({"data": dummy_data})
