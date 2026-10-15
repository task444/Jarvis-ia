
/*
 * JARVIS 2.1
 * Assistente virtual para Android
 * IA Cloudflare + memoria + voz + comandos
 */

const JARVIS_API =
  "https://jarvis-ai-backend.juliocls20101.workers.dev";

// Elementos da interface
const chat = document.getElementById("chatMessages");
const input = document.getElementById("commandInput");
const form = document.getElementById("commandForm");
const voiceButton = document.getElementById("voiceButton");
const soundButton = document.getElementById("soundButton");
const statusText = document.getElementById("assistantStatus");
const voiceStatus = document.getElementById("voiceStatus");
const aiStatus = document.getElementById("aiStatus");

// Configuracoes
let soundEnabled = true;
let listening = false;
let recognition = null;
let processing = false;

// Memoria temporaria das ultimas 5 conversas
const memoriaJarvis = [];

// Adicionar mensagens ao chat
function addMessage(sender, message) {
  const div = document.createElement("div");

  div.className = "message " + sender;
  div.textContent =
    (sender === "jarvis" ? "JARVIS: " : "VOCÊ: ") +
    message;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Respostas por voz
function speak(text) {
  if (
    !soundEnabled ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = "pt-BR";
  utterance.rate = 0.95;
  utterance.pitch = 0.9;
  utterance.volume = 1;

  const voices = speechSynthesis.getVoices();

  const brazilianVoice = voices.find(
    voice => voice.lang.toLowerCase() === "pt-br"
  );

  if (brazilianVoice) {
    utterance.voice = brazilianVoice;
  }

  speechSynthesis.speak(utterance);
}

// Normalizar texto
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Comandos locais
function getResponse(command) {
  const text = normalize(command);
  const now = new Date();

  if (
    text.includes("que horas") ||
    text.includes("horario") ||
    text === "hora"
  ) {
    return {
      message:
        "Agora são " +
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        }) +
        "."
    };
  }

  if (
    text.includes("que dia e hoje") ||
    text.includes("qual a data") ||
    text === "data"
  ) {
    return {
      message:
        "Hoje é " +
        now.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }) +
        "."
    };
  }

  if (text.includes("abrir google")) {
    return {
      message: "Abrindo o Google.",
      url: "https://www.google.com"
    };
  }

  if (text.includes("abrir youtube")) {
    return {
      message: "Abrindo o YouTube.",
      url: "https://www.youtube.com"
    };
  }

  if (text.includes("abrir github")) {
    return {
      message: "Abrindo o GitHub.",
      url: "https://github.com"
    };
  }

  if (
    text.includes("quem e voce") ||
    text.includes("se apresente")
  ) {
    return {
      message:
        "Eu sou JARVIS, seu assistente virtual " +
        "pessoal com inteligência artificial."
    };
  }

  if (
    text === "ola" ||
    text === "oi" ||
    text === "bom dia" ||
    text === "boa tarde" ||
    text === "boa noite"
  ) {
    return {
      message:
        "Olá! JARVIS online e à sua disposição."
    };
  }

  if (
    text === "ajuda" ||
    text === "comandos"
  ) {
    return {
      message:
        "Posso responder perguntas usando IA, " +
        "informar horas e datas, abrir sites " +
        "e conversar com você."
    };
  }

  if (text.includes("parar de falar")) {
    return {
      message: "Áudio interrompido.",
      stopSpeech: true
    };
  }

  // Retorna null para enviar a pergunta a IA
  return null;
}

// Consultar inteligencia artificial
async function perguntarIA(mensagem) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 25000);

  try {
    const response = await fetch(JARVIS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mensagem: mensagem,
        historico: memoriaJarvis.slice(-10)
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        "Erro HTTP: " + response.status
      );
    }

    const data = await response.json();

    if (
      typeof data.resposta !== "string" ||
      !data.resposta.trim()
    ) {
      throw new Error("Resposta invalida da IA");
    }

    return data.resposta;
  } finally {
    clearTimeout(timeout);
  }
}

// Processar comandos
async function processCommand(command) {
  const cleaned = String(command || "").trim();

  if (!cleaned) return;

  if (processing) {
    addMessage(
      "jarvis",
      "Aguarde, estou processando sua pergunta."
    );
    return;
  }

  processing = true;
  addMessage("user", cleaned);
  statusText.textContent = "JARVIS pensando...";

  try {
    const local = getResponse(cleaned);

    if (local) {
      addMessage("jarvis", local.message);

      if (local.stopSpeech) {
        if ("speechSynthesis" in window) {
          speechSynthesis.cancel();
        }
      } else {
        speak(local.message);
      }

      if (local.url) {
        const link = document.createElement("a");

        link.href = local.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Abrir site";

        chat.appendChild(link);
        chat.scrollTop = chat.scrollHeight;
      }

      return;
    }

    // Enviar pergunta para a IA
    const resposta = await perguntarIA(cleaned);

    // Salvar conversa na memoria temporaria
    memoriaJarvis.push(
      {
        role: "user",
        content: cleaned
      },
      {
        role: "assistant",
        content: resposta.slice(0, 500)
      }
    );

    // Manter somente as ultimas 10 mensagens
    if (memoriaJarvis.length > 10) {
      memoriaJarvis.splice(
        0,
        memoriaJarvis.length - 10
      );
    }

    addMessage("jarvis", resposta);
    speak(resposta);

  } catch (error) {
  console.error("Erro JARVIS:", error);

  addMessage(
    "jarvis",
    "Erro detectado: " + error.message
  );conexão."
    );

  } finally {
    processing = false;
    statusText.textContent =
      "Aguardando seus comandos...";
  }
}

// Enviar mensagem digitada
form.addEventListener("submit", event => {
  event.preventDefault();

  const command = input.value;
  input.value = "";

  processCommand(command);
});

// Comandos rapidos do HTML
function quickCommand(command) {
  processCommand(command);
}

// Ativar e desativar voz
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  if (
    !soundEnabled &&
    "speechSynthesis" in window
  ) {
    speechSynthesis.cancel();
  }

  soundButton.textContent = soundEnabled
    ? "🔊 VOZ ATIVADA"
    : "🔇 VOZ DESATIVADA";
});

// Reconhecimento de voz
const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();

  recognition.lang = "pt-BR";
  recognition.continuous = false;
  recognition.interimResults = false;

  voiceStatus.textContent = "Disponível";

  recognition.onstart = () => {
    listening = true;

    voiceButton.classList.add("listening");
    voiceButton.textContent = "🔴 OUVINDO...";

    statusText.textContent = "Estou ouvindo...";
  };

  recognition.onresult = event => {
    const transcript =
      event.results[0][0].transcript;

    input.value = transcript;
    processCommand(transcript);
    input.value = "";
  };

  recognition.onerror = event => {
    statusText.textContent =
      "Erro no microfone: " + event.error;
  };

  recognition.onend = () => {
    listening = false;

    voiceButton.classList.remove("listening");
    voiceButton.textContent =
      "🎙 ATIVAR MICROFONE";

    if (
      statusText.textContent === "Estou ouvindo..."
    ) {
      statusText.textContent =
        "Aguardando seus comandos...";
    }
  };

  voiceButton.addEventListener("click", () => {
    if (listening) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
    } catch (error) {
      statusText.textContent =
        "Não foi possível iniciar o microfone.";
    }
  });

} else {
  voiceStatus.textContent = "Não suportado";
  voiceButton.disabled = true;
  voiceButton.textContent =
    "MICROFONE INDISPONÍVEL";
}

// Inicializacao
aiStatus.textContent = "Cloudflare configurado";
statusText.textContent = "JARVIS online.";

console.log("JARVIS 2.1 inicializado.");
