#!/usr/bin/python
import sys
import subprocess

friendlyName = str(sys.argv[1])

with open('db/database.db') as myFile:
    for num, line in enumerate(myFile, 1):
        if friendlyName in line:
            command = "sed -i '" + str(num) + "d' db/database.db"
            process = subprocess.Popen(command, stdout=subprocess.PIPE)
            output, error = process.communicate()