#!/usr/bin/python
import sys

friendlyName = str(sys.argv[1])

with open("/opt/zigbee2mqtt/data/database.db", "r") as f:
    lines = f.readlines()
with open("/opt/zigbee2mqtt/data/database.db", "w") as f:
    for line in lines:
        if friendlyName not in line:
            f.write(line)