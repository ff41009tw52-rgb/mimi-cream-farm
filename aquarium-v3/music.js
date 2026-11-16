const music=document.getElementById('background-music');
const toggle=document.getElementById('music-toggle');
const error=document.getElementById('music-error');

function showPlayback() {
  toggle.textContent=music.paused ? '播放背景音樂' : '暫停背景音樂';
  toggle.toggleAttribute('data-playing',!music.paused);
}

function showError() {
  music.pause();
  showPlayback();
  error.hidden=false;
}

music.addEventListener('play',showPlayback);
music.addEventListener('pause',showPlayback);
music.addEventListener('error',showError);

toggle.addEventListener('click',async ()=>{
  error.hidden=true;
  if (!music.paused) {
    music.pause();
    return;
  }
  if (music.error) music.load();
  try {
    await music.play();
  } catch (failure) {
    if (failure.name!=='AbortError') showError();
  }
});
