#!/bin/sh
sudo kill -SIGINT $(ps aux | grep node | grep server | grep -v grep | awk '{print $2}')
