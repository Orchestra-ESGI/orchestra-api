#!/usr/bin/python

friendlyName = str(sys.argv[1])
with open('db/database.db') as myFile:
    for num, line in enumerate(myFile, 1):
        if friendlyName in line:
            del lines[num]
    
    newFile = open('db/database.db', 'w+')
    for line in lines:
        newFile.write(line)
    newFile.close()