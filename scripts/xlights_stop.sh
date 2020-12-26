#!/bin/sh
sudo kill -s SIGINT $(ps aux | grep node | grep server | grep -v grep | awk '{print $2}')
