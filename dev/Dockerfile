# syntax=docker/dockerfile:1

FROM kartoza/geoserver:2.19.0
USER root

RUN apt update && apt install openssh-server sudo joe nano postgresql postgis python3 -y
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/g' /etc/ssh/sshd_config

RUN useradd -rm -d /home/ubuntu -s /bin/bash -g root -G sudo -u 1001 fire 
RUN echo 'fire:fire_pw' | chpasswd && echo 'root:fire_pw' | chpasswd

COPY geoserver/web.xml /usr/local/tomcat/webapps/geoserver/WEB-INF/
COPY postgres/*.conf /home/fire/postgres_conf/
COPY postgres/start_postgres.sh /home/fire/

EXPOSE 22
EXPOSE 5432

ENTRYPOINT service ssh start \ 
	&& /home/fire/start_postgres.sh \
	&& /scripts/entrypoint.sh \
	&& tail -F /var/log/postgresql/postgresql-11-main.log
