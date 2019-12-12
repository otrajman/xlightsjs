#!/bin/sh
DIR=/home/dietpi/xlightsjs
SCRIPT="npm run start"
PATH=$PATH:$DIR
LOGFILE=/var/log/xlights/`date +"%F"`.log

cd $DIR
echo `pwd` >> $LOGFILE 2>&1 
echo $SCRIPT www $CONFIG >> $LOGFILE 2>&1
$SCRIPT www $CONFIG >> $LOGFILE 2>&1
echo $? >> $LOGFILE 2>&1
