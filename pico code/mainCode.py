from machine import UART, Pin
import bluetooth
import time

# ---------------- GPS UART ----------------
uart = UART(0, baudrate=9600, tx=Pin(0), rx=Pin(1))

# ---------------- BUTTON (GPIO 28) ----------------
button = Pin(28, Pin.IN, Pin.PULL_DOWN)

# ---------------- GPS STATE ----------------
lat = None
lon = None
last_gps_send = 0
gps_interval = 3  # seconds (2–5 recommended)

# ---------------- BLE ----------------
ble = bluetooth.BLE()
ble.active(True)

conn_handle = None
ble_ready = False

# ---------------- UUIDs (NUS) ----------------
# Fill with your device's BLE protocols
_UART_UUID = bluetooth.UUID("")
_UART_TX = bluetooth.UUID("")
_UART_RX = bluetooth.UUID("")

_UART_SERVICE = (
    _UART_UUID,
    (
        (_UART_TX, bluetooth.FLAG_NOTIFY),
        (_UART_RX, bluetooth.FLAG_WRITE),
    ),
)

((tx_handle, rx_handle),) = ble.gatts_register_services((_UART_SERVICE,))

# ---------------- BLE IRQ ----------------
def ble_irq(event, data):
    global conn_handle, ble_ready

    if event == 1:  # connect
        conn_handle, _, _ = data
        ble_ready = True
        print("BLE CONNECTED")

    elif event == 2:  # disconnect
        conn_handle = None
        ble_ready = False
        print("BLE DISCONNECTED")
        advertise()

ble.irq(ble_irq)

# ---------------- ADVERTISE ----------------
def advertise():
    name = "Pico2W"

    payload = bytearray()
    payload.extend(bytes((2, 1, 6)))
    payload.extend(bytes((len(name) + 1, 0x09)))
    payload.extend(name.encode())

    ble.gap_advertise(100, payload)
    print("Advertising...")

advertise()

# ---------------- GPS PARSER ----------------
def convert_coord(raw, direction, is_lat=True):
    try:
        if not raw:
            return None

        deg_len = 2 if is_lat else 3
        deg = float(raw[:deg_len])
        minutes = float(raw[deg_len:])

        val = deg + minutes / 60

        if direction in ["S", "W"]:
            val *= -1

        return val
    except:
        return None


def parse_rmc(line):
    global lat, lon

    p = line.split(",")

    if len(p) < 6:
        return

    if p[2] == "A":
        lat = convert_coord(p[3], p[4], True)
        lon = convert_coord(p[5], p[6], False)

# ---------------- BLE SEND ----------------
def ble_send(msg):
    global conn_handle, ble_ready

    if not ble_ready or conn_handle is None:
        return

    try:
        ble.gatts_notify(conn_handle, tx_handle, msg)
        print("BLE SENT:", msg)
    except:
        pass

# ---------------- BUTTON ----------------
def button_handler(pin):
    time.sleep_ms(50)

    msg = f"BTN,lat={lat},lon={lon}"
    ble_send(msg)

button.irq(trigger=Pin.IRQ_RISING, handler=button_handler)

# ---------------- MAIN LOOP ----------------
print("Pico GPS + BLE ready")

while True:

    # ---------------- READ GPS ----------------
    if uart.any():
        try:
            line = uart.readline().decode().strip()

            if line.startswith("$GPRMC"):
                parse_rmc(line)

        except:
            pass

    # ---------------- PERIODIC GPS SEND ----------------
    now = time.time()

    if lat is not None and lon is not None:
        if now - last_gps_send >= gps_interval:
            last_gps_send = now
            msg = f"GPS,lat={lat},lon={lon}"
            ble_send(msg)

    time.sleep(0.05)
