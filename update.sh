#!/bin/bash
sudo git reset --hard HEAD
if [ $1 = false ]; then
    sudo git fetch
    sudo git status > 'update.txt'
    exit 1
fi

sudo systemctl stop orchestra
echo "before pull"
sudo git pull
echo "before npm install"
sudo npm install
echo "before starting service..."
sudo systemctl start orchestra

echo "Update done!"
