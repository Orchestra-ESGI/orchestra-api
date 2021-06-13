#!/usr/bin/python

friendlyName = str(sys.argv[1])

with open("/orchestra-api/db/database.db", "r") as f:
    lines = f.readlines()
with open("/orchestra-api/db/database.db", "w") as f:
    for line in lines:
        if friendlyName not in line:
            f.write(line)