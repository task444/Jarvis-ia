
/*
 * JARVIS 1.0
 * Assistente virtual para Android
 * Voz, texto e comandos básicos
 */

const JARVIS_API =
  "https://jarvis-ai-backend.juliocls20101.workers.dev";



  
async function processCommand(command) {
  const cleaned = command.trim();
  if (!cleaned) return;

  addMessage("user", cleaned);
  statusText.textContent = "JARVIS pensando...";

  const response = getResponse(cleaned);

  const respostaAntiga =
    response.message.startsWith(
      "Ainda não tenho uma resposta inteligente"
    );

  // Comandos locais
  if (!respostaAntiga) {
    addMessage("jarvis", response.message);

    if (response.stopSpeech) {
      window.speechSynthesis?.cancel();
    } else {
      speak(response.message);
    }

    if (response.url) {
      const link = document.createElement("a");
      link.href = response.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Abrir site";
      chat.appendChild(link);
    }

    statusText.textContent = "JARVIS online.";
    return;
  }

  // Perguntas enviadas ao Cloudflare
  try {
    const resposta = await perguntarIA(cleaned);

    if (typeof memoriaJarvis !== "undefined") {
      memoriaJarvis.push(
        { role: "user", content: cleaned },
        { role: "assistant", content: resposta }
      );

      if (memoriaJarvis.length > 10) {
        memoriaJarvis.splice(
          0,
          memoriaJarvis.length - 10
        );
      }
    }

    addMessage("jarvis", resposta);
    speak(resposta);

  } catch (error) {
    console.error("Erro JARVIS AI:", error);

    addMessage(
      "jarvis",
      "Não consegui conectar ao cérebro de IA. " +
      "Verifique a conexão com o Cloudflare."
    );

  } finally {
    statusText.textContent = "JARVIS online.";
  }
}
    const response = await fetch(JARVIS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ mensagem }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();

    if (typeof data.resposta !== "string") {
      throw new Error("Resposta inválida");
    }

    return data.resposta;

  } finally {
    clearTimeout(timeout);
  }
}
alert("JARVIS: JavaScript carregado com sucesso!");
const chat = document.getElementById("chatMessages");
const input = document.getElementById("commandInput");
const form = document.getElementById("commandForm");
const voiceButton = document.getElementById("voiceButton");
const soundButton = document.getElementById("soundButton");
const statusText = document.getElementById("assistantStatus");
const voiceStatus = document.getElementById("voiceStatus");

let soundEnabled = true;
let listening = false;
let recognition = null;

// Adicionar mensagem ao terminal
function addMessage(sender, message) {
  const div = document.createElement("div");
  div.className = "message " + sender;
  div.textContent =
    (sender === "jarvis" ? "JARVIS: " : "VOCÊ: ") + message;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Falar usando a voz do dispositivo
function speak(text) {
  if (!soundEnabled || !("speechSynthesis" in window)) {
    return;
  }

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 1;
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

// Interpretar comandos
function getResponse(command) {
  const text = normalize(command);
  const now = new Date();

  if (
    text.includes("que horas") ||
    text.includes("horario") ||
    text === "hora"
  ) {
    return {
      message: "Agora são " +
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        }) + "."
    };
  }

  if (
    text.includes("data") ||
    text.includes("que dia e hoje")
  ) {
    return {
      message: "Hoje é " +
        now.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }) + "."
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
        "Eu sou JARVIS, seu assistente virtual pessoal. " +
        "Estou em desenvolvimento e pronto para receber comandos."
    };
  }

  if (
    text.includes("ola") ||
    text.includes("bom dia") ||
    text.includes("boa tarde") ||
    text.includes("boa noite")
  ) {
    return {
      message: "Olá! JARVIS online e à sua disposição."
    };
  }

  if (
    text.includes("ajuda") ||
    text.includes("comandos")
  ) {
    return {
      message:
        "Você pode perguntar as horas, a data, " +
        "pedir para abrir Google, YouTube ou GitHub, " +
        "ou solicitar minha apresentação."
    };
  }

  if (text.includes("parar de falar")) {
    return {
      message: "Áudio interrompido.",
      stopSpeech: true
    };
  }

  return {
    message:
      "Ainda não tenho uma resposta inteligente para isso. " +
      "Minha conexão com inteligência artificial " +
      "será adicionada na próxima versão."
  };
}

// Processar comando
function processCommand(command) {
  const cleaned = command.trim();

  if (!cleaned) return;

  addMessage("user", cleaned);
  statusText.textContent = "Processando comando...";

  const response = getResponse(cleaned);

  addMessage("jarvis", response.message);
  statusText.textContent = "Aguardando seus comandos...";

  if (response.stopSpeech) {
    speechSynthesis.cancel();
    return;
  }

  speak(response.message);

  if (response.url) {
    const opened = window.open(
      response.url,
      "_blank",
      "noopener,noreferrer"
    );

    if (!opened) {
      addMessage(
        "jarvis",
        "O navegador pode ter bloqueado a abertura. " +
        "Tente usar o comando digitado ou permitir pop-ups."
      );
    }
  }
}

// Enviar comando digitado
form.addEventListener("submit", event => {
  event.preventDefault();

  const command = input.value;
  input.value = "";

  processCommand(command);
});

// Botões de comandos rápidos
function quickCommand(command) {
  processCommand(command);
}

// Ativar ou desativar voz
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  if (!soundEnabled && "speechSynthesis" in window) {
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
    voiceButton.textContent = "🎙 ATIVAR MICROFONE";

    if (statusText.textContent === "Estou ouvindo...") {
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
  voiceButton.textContent = "MICROFONE INDISPONÍVEL";
}

// Inicialização
document.getElementById("aiStatus").textContent =
  "Cloudflare configurado";
statusText.textContent = "JARVIS online.";

console.log("JARVIS 1.0 inicializado.");
