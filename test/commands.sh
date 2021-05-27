# Some command-line test runs of the tool that point directly to my www Apache folder

#hls-live2vod -o /usr/local/var/www/live2vod/mux -s 60 -v https://stream.mux.com/<ID>.m3u8 | tee mux.log
hls-live2vod -o /usr/local/var/www/live2vod/bipbop -s 60 -v http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8 | tee bipbop.log

hls-live2vod -o /usr/local/var/www/live2vod/bitm1 -s 60 -v https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8 |tee bitm1.log
hls-live2vod -o /usr/local/var/www/live2vod/ak1 -s 60 -v https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8 |tee ak1.log

hls-live2vod -o /usr/local/var/www/live2vod/wse -s 60 -v http://localhost:1935/live/bbb/playlist.m3u8 |tee wse.log
hls-live2vod -o /usr/local/var/www/live2vod/wse2 -s 60 -v https://wowzaec2demo.streamlock.net/live/bigbuckbunny/playlist.m3u8 |tee wse2.log


#hls-live2vod -o /usr/local/var/www/live2vod/bitm2 -s 60 -v https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8 |tee bitm2.log

hls-live2vod -o /usr/local/var/www/live2vod/llhls -s 60 -v https://ll-hls-test-apple.akamaized.net/cmaf/master.m3u8 |tee llhls.log
