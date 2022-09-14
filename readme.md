# Portugal fire map

This is a webmap to show the wildfires in Portugal since 2001. Data comes from [here](https://github.com/cityxdev/icnf_fire_data)
<br/><br/>**Deployed here: [statincendios.pt](statincendios.pt)** 

## Pre-req
1. `sudo apt install docker.io`
2. `sudo apt install npm`
3. `npm install`

## Dev environment
* The backend needs for the frontend development run in a docker
* Build: `cd backend ; sudo ./build.sh`. You can add `--with-polygons` (it will take a LOT of time)
* Start: `sudo docker container start portugal_fire_map_container` (not necessary after a build)
* Stop: `sudo docker container stop portugal_fire_map_container`
* ssh to the container: `ssh-keygen -f ~/.ssh/known_hosts -R "[localhost]:8022" ; ssh fire@localhost -p8022`
* psql to the container: `psql -Ufire -h127.0.0.1 -p5434 icnf_fire_data` pw: `fire_pw`
* copy geoserver data_dir to local: `cd backend/geoserver ; sudo ./copy_data_dir.sh`
* copy geoserver geowebcache to local: `cd backend/geoserver ; sudo ./copy_geowebcache.sh` (this can take a while)


## Webserver for local dev
* Launch with `./launch_server.sh` (ctrl+c to stop)



