document.addEventListener("DOMContentLoaded", () => {
  console.log("STEP 1 COMPLETE");

  initFeedClock();
  initParticles();
  initCounters();
  initEnterButton();
});

function initFeedClock() {
  const feed = document.getElementById("feedTimestamp");
  if (!feed) return;

  const tick = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    feed.textContent = `FEED: ${hh}:${mm}:${ss}`;
  };

  tick();
  setInterval(tick, 1000);
}

function initParticles() {
  if (!window.tsParticles) return;

  window.tsParticles.load("particles-bg", {
    fullScreen: { enable: false },
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      number: {
        value: 42,
        density: {
          enable: true,
          area: 1000
        }
      },
      color: { value: ["#8e8e8e", "#5c5c5c", "#7a7a7a"] },
      opacity: {
        value: { min: 0.03, max: 0.16 },
        animation: {
          enable: true,
          speed: 0.35,
          minimumValue: 0.02,
          sync: false
        }
      },
      size: {
        value: { min: 0.6, max: 2.2 }
      },
      move: {
        enable: true,
        speed: { min: 0.08, max: 0.45 },
        direction: "none",
        random: true,
        straight: false,
        outModes: { default: "out" }
      }
    },
    detectRetina: true,
    interactivity: {
      events: {
        onHover: { enable: false },
        onClick: { enable: false },
        resize: true
      }
    }
  });
}

function initCounters() {
  const counters = document.querySelectorAll(".value[data-target]");

  counters.forEach((counter, index) => {
    const target = parseFloat(counter.getAttribute("data-target") || "0");
    const format = counter.getAttribute("data-format") || "number";
    const duration = 10000 + index * 2000;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2.4);
      const current = target * eased;

      if (format === "percent") {
        counter.textContent = `${current.toFixed(1)}%`;
      } else {
        counter.textContent = Math.floor(current).toLocaleString("en-US");
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  });
}

function initEnterButton() {
  const button = document.getElementById("enterBtn");
  const flash = document.getElementById("flashOverlay");
  if (!button || !flash) return;

  const hoverBuzz = new Howl({
    src: [
      "data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAAAAAAAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/"
    ],
    volume: 0.2,
    preload: true
  });

  let lastHoverPlay = 0;

  button.addEventListener("mouseenter", () => {
    const now = Date.now();
    if (now - lastHoverPlay > 300) {
      hoverBuzz.play();
      lastHoverPlay = now;
    }
  });

  button.addEventListener("click", () => {
    flash.classList.remove("flash-active");
    void flash.offsetWidth;
    flash.classList.add("flash-active");

    setTimeout(() => {
      window.location.href = "persona-selection.html";
    }, 430);
  });
}
