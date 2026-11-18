const viewer = document.querySelector("#photo-viewer");

if (typeof viewer.showModal === "function") {
  const title = viewer.querySelector("h2");
  const photo = viewer.querySelector(".viewer-photo");
  const caption = viewer.querySelector(".viewer-caption");
  const source = viewer.querySelector(".viewer-source a");
  const status = viewer.querySelector(".viewer-status");
  const controls = viewer.querySelector(".viewer-controls");
  const previous = controls.querySelector("[data-previous]");
  const next = controls.querySelector("[data-next]");
  const counter = controls.querySelector("output");
  let slides = [];
  let activeIndex = 0;

  function showSlide(index) {
    const slide = slides[index];
    if (!slide) return;

    activeIndex = index;
    title.textContent = slide.title;
    photo.hidden = true;
    status.textContent = "照片載入中…";
    status.hidden = false;
    photo.alt = slide.alt;
    photo.src = slide.image;
    if (photo.complete && photo.naturalWidth && photo.currentSrc === photo.src) showLoadedPhoto();
    caption.textContent = slide.caption ?? "";
    caption.hidden = !slide.caption;
    source.href = slide.source;
    source.textContent = slide.credit ?? "查看原始照片來源 ↗";

    controls.hidden = slides.length === 1;
    previous.setAttribute("aria-disabled", String(index === 0));
    next.setAttribute("aria-disabled", String(index === slides.length - 1));
    counter.textContent = `${index + 1} / ${slides.length}`;
  }

  for (const link of document.querySelectorAll(".photo-link")) {
    link.addEventListener("click", (event) => {
      const thumbnail = link.querySelector("img");
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !thumbnail.naturalWidth) return;
      event.preventDefault();

      slides = [{
        title: link.dataset.title,
        image: thumbnail.currentSrc || thumbnail.src,
        alt: thumbnail.alt,
        source: link.href,
      }];

      const dish = link.closest(".plant").querySelector(".plant-dish");
      if (dish) {
        slides.push({
          title: dish.querySelector("strong").textContent,
          image: dish.dataset.image,
          alt: dish.dataset.alt,
          source: dish.dataset.source,
          credit: dish.dataset.credit,
          caption: dish.querySelector("span").textContent,
        });
      }

      showSlide(0);
      viewer.showModal();
    });
  }

  previous.addEventListener("click", () => showSlide(activeIndex - 1));
  next.addEventListener("click", () => showSlide(activeIndex + 1));

  viewer.addEventListener("keydown", (event) => {
    if (slides.length < 2 || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(activeIndex + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });

  function showLoadedPhoto() {
    photo.hidden = false;
    status.hidden = true;
  }

  photo.addEventListener("load", showLoadedPhoto);
  photo.addEventListener("error", () => {
    photo.hidden = true;
    status.textContent = "照片目前無法載入，可到下方來源查看。";
    status.hidden = false;
  });

  viewer.addEventListener("click", (event) => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
  });
}
