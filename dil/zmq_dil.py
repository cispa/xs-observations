import zmq
import sys

message = sys.argv[1]

context = zmq.Context()
socket = context.socket(zmq.REQ)
socket.connect("tcp://localhost:5555")
socket.RCVTIMEO = 2000 # in milliseconds

try:
    socket.send_string(message)
    reply = socket.recv_string()
    print(reply)
except zmq.error.Again:
    print("Server down. Please contact Jannis immediately.")

