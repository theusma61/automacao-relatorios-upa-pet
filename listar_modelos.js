const config = require('./config.json');

async function listar() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.models) {
    console.log("Modelos disponíveis:");
    data.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
      .forEach(m => console.log(m.name));
  } else {
    console.log("Resposta:", data);
  }
}

listar();
