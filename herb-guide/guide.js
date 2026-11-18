const viewer = document.querySelector("#photo-viewer");

if (typeof viewer.showModal === "function") {
  const title = viewer.querySelector("h2");
  const photo = viewer.querySelector("img");
  const source = viewer.querySelector("a");

  for (const link of document.querySelectorAll(".photo-link")) {
    link.addEventListener("click", (event) => {
      const thumbnail = link.querySelector("img");
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !thumbnail.naturalWidth) return;
      event.preventDefault();
      title.textContent = link.dataset.title;
      photo.src = thumbnail.currentSrc || thumbnail.src;
      photo.alt = thumbnail.alt;
      photo.hidden = false;
      source.href = link.href;
      viewer.showModal();
    });
  }

  viewer.addEventListener("click", (event) => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
  });
}
