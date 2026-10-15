
/*
 * JARVIS 2.2
 * Assistente virtual para Android
 * Cloudflare Workers AI + voz + memoria + comandos
 */

"use strict";

// ========================================
// 1. CONFIGURACAO
// ========================================

const JARVIS_API =
  "https://jarvis-ai-backend.juliocls20101.workers.dev";

const MAX_HISTORICO = 10;
const TEMPO_LIMITE = 30000;

// ========================================
// 2. ELEMENTOS DA INTERFACE
// ========================================

const chat = document.getElementById("chatMessages");
const input = document.getElementById("commandInput");
const form = document.getElementById("commandForm");

const voiceButton = document.getElementById("voiceButton");
const soundButton = document.getElementById("soundButton");

const statusText = document.getElementById("assistantStatus");
const voiceStatus = document.getElementById("voiceStatus");
const aiStatus = document.getElementById("aiStatus");

// ========================================
// 3. ESTADO DO JARVIS
// ========================================

let soundEnabled = true;
let listening = false;
let recognition = null;
let processing = false;

const memoriaJarvis = [];

// ========================================
// 4. UTILIDADES
// ========================================

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function addMessage(sender, message) {
  if (!chat) return;

  const div = document.createElement("div");

  div.className = "message " + sender;

  const nome = sender === "jarvis"
    ? "JARVIS: "
    : "VOCÊ: ";

  div.textContent = nome + String(message);

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function setProcessing(value) {
  processing = value;

  setText(
    statusText,
    value
      ? "Processando sua solicitação..."
      : "Aguardando seus comandos..."
  );

  if (input) {
    input.disabled = value;
  }
}

// ========================================
// 5. VOZ DO JARVIS
// ========================================

function speak(text) {
  if (!soundEnabled) return;

  if (!("speechSynthesis" in window)) {
    setText(
      voiceStatus,
      "Voz não disponível neste navegador"
    );
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(String(text));

    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    utterance.volume = 1;

    const voices =
      window.speechSynthesis.getVoices();

    const brazilianVoice = voices.find(
      voice =>
        voice.lang &&
        voice.lang.toLowerCase().startsWith("pt-br")
    );

    if (brazilianVoice) {
      utterance.voice = brazilianVoice;
    }

    utterance.onstart = () => {
      setText(voiceStatus, "JARVIS falando");
    };

    utterance.onend = () => {
      setText(voiceStatus, "Voz disponível");
    };

    utterance.onerror = () => {
      setText(voiceStatus, "Falha na reprodução de voz");
    };

    window.speechSynthesis.speak(utterance);

  } catch (error) {
    console.error("Erro de voz:", error);
  }
}

// ========================================
// 6. COMANDOS LOCAIS
// ========================================

function getResponse(command) {
  const text = normalize(command);

  if (
    text === "horas" ||
    text.includes("que horas") ||
    text.includes("hora atual")
  ) {
    return {
      message:
        "Agora são " +
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        }) +
        "."
    };
  }

  if (
    text === "data" ||
    text.includes("que dia e hoje") ||
    text.includes("data de hoje")
  ) {
    return {
      message:
        "Hoje é " +
        new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }) +
        "."
    };
  }

  if (
    text === "abrir google" ||
    text === "abra o google"
  ) {
    return {
      message: "Abrindo Google.",
      url: "https://www.google.com"
    };
  }

  if (
    text === "abrir youtube" ||
    text === "abra o youtube"
  ) {
    return {
      message: "Abrindo YouTube.",
      url: "https://www.youtube.com"
    };
  }

  if (
    text === "abrir github" ||
    text === "abra o github"
  ) {
    return {
      message: "Abrindo GitHub.",
      url: "https://github.com"
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
        "Posso responder perguntas usando inteligência " +
        "artificial, conversar com você, informar horas " +
        "e datas e abrir Google, YouTube ou GitHub."
    };
  }

  if (
    text.includes("parar de falar") ||
    text.includes("pare de falar") ||
    text === "silencio"
  ) {
    return {
      message: "Áudio interrompido.",
      stopSpeech: true
    };
  }

  return null;
}

// ========================================
// 7. CONEXAO COM A INTELIGENCIA ARTIFICIAL
// ========================================

async function perguntarIA(mensagem) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, TEMPO_LIMITE);

  try {
    const response = await fetch(JARVIS_API, {
      method: "POST",

      mode: "cors",

      cache: "no-store",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        mensagem: mensagem,
        historico: memoriaJarvis.slice(-MAX_HISTORICO)
      }),

      signal: controller.signal
    });

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "O servidor retornou uma resposta que não é JSON."
      );
    }

    if (!response.ok) {
      const detalhe =
        data.erro ||
        data.error ||
        data.message ||
        "Erro desconhecido";

      throw new Error(
        "HTTP " + response.status + ": " + detalhe
      );
    }

    if (
      !data ||
      typeof data.resposta !== "string" ||
      !data.resposta.trim()
    ) {
      throw new Error(
        "O servidor respondeu, mas não enviou " +
        "uma resposta válida da IA."
      );
    }

    return data.resposta.trim();

  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "Tempo limite excedido. O servidor demorou " +
        "mais de 30 segundos para responder."
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Falha de rede ou bloqueio CORS. " +
        "Verifique se o Cloudflare permite " +
        "requisições de https://task444.github.io."
      );
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}

// ========================================
// 8. PROCESSAR COMANDOS
// ========================================

async function processCommand(command) {
  const cleaned = String(command || "").trim();

  if (!cleaned) return;
  if (processing) return;

  addMessage("user", cleaned);

  setProcessing(true);

  try {
    const local = getResponse(cleaned);

    if (local) {
      addMessage("jarvis", local.message);

      if (local.stopSpeech) {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
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

        if (chat) {
          chat.appendChild(link);
          chat.scrollTop = chat.scrollHeight;
        }
      }

      return;
    }

    setText(aiStatus, "IA processando...");

    const resposta = await perguntarIA(cleaned);

    memoriaJarvis.push(
      {
        role: "user",
        content: cleaned.slice(0, 500)
      },
      {
        role: "assistant",
        content: resposta.slice(0, 500)
      }
    );

    if (memoriaJarvis.length > MAX_HISTORICO) {
      memoriaJarvis.splice(
        0,
        memoriaJarvis.length - MAX_HISTORICO
      );
    }

    addMessage("jarvis", resposta);

    setText(aiStatus, "IA conectada");

    speak(resposta);

  } catch (error) {
    console.error("Erro JARVIS:", error);

    const mensagemErro =
      error && error.message
        ? error.message
        : "Erro desconhecido.";

    addMessage(
      "jarvis",
      "Erro detectado: " + mensagemErro
    );

    setText(aiStatus, "Erro na IA");

  } finally {
    setProcessing(false);
  }
}

// ========================================
// 9. ENVIO DE MENSAGENS
// ========================================

if (form) {
  form.addEventListener("submit", event => {
    event.preventDefault();

    if (!input) return;

    const command = input.value.trim();

    if (!command || processing) return;

    input.value = "";

    processCommand(command);
  });
}

// ========================================
// 10. COMANDOS RAPIDOS
// ========================================

window.quickCommand = function(command) {
  processCommand(command);
};

// ========================================
// 11. MICROFONE
// ========================================

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();

  recognition.lang = "pt-BR";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    listening = true;

    setText(voiceStatus, "Ouvindo...");

    if (voiceButton) {
      voiceButton.classList.add("active");
    }
  };

  recognition.onresult = event => {
    const transcript =
      event.results[0][0].transcript;

    if (input) {
      input.value = transcript;
    }

    processCommand(transcript);
  };

  recognition.onerror = event => {
    console.error(
      "Erro no reconhecimento de voz:",
      event.error
    );

    setText(
      voiceStatus,
      "Erro no microfone: " + event.error
    );
  };

  recognition.onend = () => {
    listening = false;

    if (voiceButton) {
      voiceButton.classList.remove("active");
    }

    setText(voiceStatus, "Microfone disponível");
  };

  if (voiceButton) {
    voiceButton.addEventListener("click", () => {
      try {
        if (listening) {
          recognition.stop();
        } else if (!processing) {
          if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
          }

          recognition.start();
        }
      } catch (error) {
        console.error("Erro no microfone:", error);
      }
    });
  }

} else {
  setText(
    voiceStatus,
    "Reconhecimento de voz indisponível"
  );

  if (voiceButton) {
    voiceButton.disabled = true;
  }
}

// ========================================
// 12. ATIVAR E DESATIVAR SOM
// ========================================

if (soundButton) {
  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    if (!soundEnabled) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      setText(voiceStatus, "Som desativado");

    } else {
      setText(voiceStatus, "Som ativado");
      speak("Sistema de voz ativado.");
    }
  });
}

// ========================================
// 13. INICIALIZACAO
// ========================================

function iniciarJarvis() {
  setText(
    statusText,
    "Aguardando seus comandos..."
  );

  setText(
    aiStatus,
    "IA pronta para teste"
  );

  if (SpeechRecognition) {
    setText(
      voiceStatus,
      "Microfone disponível"
    );
  }

  console.log("JARVIS 2.2 inicializado.");
  console.log("API configurada:", JARVIS_API);
}

iniciarJarvis();
