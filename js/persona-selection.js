document.addEventListener("DOMContentLoaded", () => {
  console.log("STEP 2 COMPLETE");

  initParticles();
  initPersonaSelection();
});

function initParticles() {
  if (!window.tsParticles) return;

  window.tsParticles.load("particles-bg", {
    fullScreen: { enable: false },
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      number: {
        value: 40,
        density: {
          enable: true,
          area: 900
        }
      },
      color: { value: ["#8f8f8f", "#666666", "#7a7a7a"] },
      opacity: {
        value: { min: 0.03, max: 0.14 },
        animation: {
          enable: true,
          speed: 0.35,
          minimumValue: 0.02,
          sync: false
        }
      },
      size: {
        value: { min: 0.5, max: 2 }
      },
      move: {
        enable: true,
        speed: { min: 0.08, max: 0.42 },
        direction: "none",
        random: true,
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

function initPersonaSelection() {
  const cards = document.querySelectorAll(".persona-card");
  const confirmBtn = document.getElementById("confirmBtn");
  const countdownText = document.getElementById("countdownText");
  const redFlash = document.getElementById("redFlash");

  if (!cards.length || !confirmBtn || !countdownText || !redFlash) return;

  let selectedCard = null;
  let locking = false;

  const stampSound = new Howl({
    src: [
      "data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAAAAAAAP8A/wD/AP8A/wD/AP8A/wD/AAAAAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/"
    ],
    volume: 0.42,
    rate: 0.65,
    preload: true
  });

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      if (locking) return;

      cards.forEach((item) => item.classList.remove("selected"));
      card.classList.add("selected");
      selectedCard = card;
      confirmBtn.disabled = false;
      countdownText.textContent = "";
    });
  });

  confirmBtn.addEventListener("click", () => {
    if (!selectedCard || locking) return;

    locking = true;
    confirmBtn.disabled = true;

    const personaData = {
      name: selectedCard.dataset.name,
      loyalty: Number(selectedCard.dataset.loyalty),
      danger: Number(selectedCard.dataset.danger)
    };

    localStorage.setItem("zkSelectedPersona", JSON.stringify(personaData));
    localStorage.setItem("zkPersonaName", personaData.name);
    localStorage.setItem("zkPersonaLoyalty", String(personaData.loyalty));
    localStorage.setItem("zkPersonaDanger", String(personaData.danger));

    console.log("Selected persona:", personaData);

    startCountdown(countdownText, () => {
      stampSound.play();
      document.body.classList.add("transitioning");
      redFlash.classList.remove("flash-on");
      void redFlash.offsetWidth;
      redFlash.classList.add("flash-on");

      setTimeout(() => {
        window.location.href = "game.html";
      }, 900);
    });
  });
}

function startCountdown(element, onDone) {
  let count = 3;

  element.textContent = `IDENTITY LOCKED IN ${count}...`;

  const timer = setInterval(() => {
    count -= 1;

    if (count > 0) {
      element.textContent = `IDENTITY LOCKED IN ${count}...`;
      return;
    }

    clearInterval(timer);
    element.textContent = "IDENTITY CONFIRMED";
    onDone();
  }, 1000);
}
