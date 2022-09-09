#!/bin/bash

echo '=========================Lets stop any running stuff========================='
docker container stop portugal_fire_map_container ; docker container rm portugal_fire_map_container ; docker image rm portugal_fire_map

echo '=========================Lets build the container and launch it========================='
docker build -t portugal_fire_map .
docker run -d -p 8600:8080 -p 8022:22 -p 5434:5432 --name portugal_fire_map_container portugal_fire_map

echo '=========================Lets update data========================='
rm -rf icnf_fire_data || true
wget https://github.com/cityxdev/icnf_fire_data/archive/refs/heads/main.zip -O icnf_fire_data.zip
apt-get install unzip -y && unzip icnf_fire_data.zip -d icnf_fire_data
cp db.ini icnf_fire_data/icnf_fire_data-main
initial_dir=`pwd`
cd icnf_fire_data/icnf_fire_data-main
apt install python3 -y && apt install python3-pip -y && pip3 install pandas && pip3 install psycopg2-binary
if [ "$1" == "--with-polygons" ]; then
	./build_with_polygons.sh
else
	./build.sh
fi
cd ${initial_dir}

echo '=========================Lets cleanup========================='
rm icnf_fire_data.zip
rm -r icnf_fire_data

echo '=========================END========================='

