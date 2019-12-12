#!/bin/sh
DIR=/home/dietpi/xlightsjs
SERVER=$DIR/scripts/xlights_server.sh
PATH=$PATH:$DIR
LOGFILE=/var/log/xlights/`date +"%F"`.log

cd $DIR
sudo -u dietpi $SERVER &
