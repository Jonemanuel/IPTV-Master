import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Hls from "hls.js";

const App = () => {
  const [url, setUrl] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [canais, setCanais] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [pesquisa, setPesquisa] = useState("");
  const videoRef = useRef(null);

  const carregarListaM3U = async (link) => {
    setLoading(true);
    setProgresso(0);
    try {
      const { data } = await axios.get(link, {
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setProgresso(percentCompleted);
        }
      });
      const linhas = data.split("\n");
      const lista = [];
      let categoriaAtual = "Desconhecido";

      for (let i = 0; i < linhas.length; i++) {
        if (linhas[i].includes("group-title")) {
          const match = linhas[i].match(/group-title="(.*?)"/);
          if (match) categoriaAtual = match[1];
        }
        if (linhas[i].startsWith("#EXTINF")) {
          const nome = linhas[i].split(",")[1] || "Sem nome";
          const urlStream = linhas[i + 1];
          lista.push({ nome, urlStream, categoria: categoriaAtual });
        }
      }

      const categorias = lista.reduce((acc, canal) => {
        if (!acc[canal.categoria]) acc[canal.categoria] = [];
        acc[canal.categoria].push(canal);
        return acc;
      }, {});

      setCanais(categorias);
      localStorage.setItem("listaM3U", JSON.stringify(categorias));
    } catch (error) {
      console.error("Erro ao carregar lista M3U:", error);
    }
    setLoading(false);
  };

  const carregarListaComLogin = () => {
    if (login && senha && serverUrl) {
      const urlGerada = `${serverUrl}/get.php?username=${login}&password=${senha}&type=m3u_plus&output=mpegts`;
      carregarListaM3U(urlGerada);
    }
  };

  const carregarVideo = (urlStream) => {
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(urlStream);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current.play();
      });
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = urlStream;
      videoRef.current.addEventListener("loadedmetadata", () => {
        videoRef.current.play();
      });
    }
  };

  useEffect(() => {
    if (selecionado) carregarVideo(selecionado.urlStream);
  }, [selecionado]);

  const carregarArquivo = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const linhas = e.target.result.split("\n");
        const lista = [];
        let categoriaAtual = "Desconhecido";

        for (let i = 0; i < linhas.length; i++) {
          if (linhas[i].includes("group-title")) {
            const match = linhas[i].match(/group-title="(.*?)"/);
            if (match) categoriaAtual = match[1];
          }
          if (linhas[i].startsWith("#EXTINF")) {
            const nome = linhas[i].split(",")[1] || "Sem nome";
            const urlStream = linhas[i + 1];
            lista.push({ nome, urlStream, categoria: categoriaAtual });
          }
        }

        const categorias = lista.reduce((acc, canal) => {
          if (!acc[canal.categoria]) acc[canal.categoria] = [];
          acc[canal.categoria].push(canal);
          return acc;
        }, {});

        setCanais(categorias);
        localStorage.setItem("listaM3U", JSON.stringify(categorias));
      };
      reader.readAsText(file);
    }
  };

  const canaisFiltrados = Object.entries(canais).reduce((acc, [categoria, lista]) => {
    const filtrados = lista.filter((canal) => canal.nome.toLowerCase().includes(pesquisa.toLowerCase()));
    if (filtrados.length > 0) acc[categoria] = filtrados;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Arial, sans-serif" }}>
      <div style={{ width: "30%", padding: "20px", borderRight: "1px solid #ddd", overflowY: "auto", backgroundColor: "#1f2937", color: "#fff" }}>
        <h3>Lista de Canais</h3>
        <input
          type="text"
          placeholder="Pesquisar canal"
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
        />

        <input
          type="text"
          placeholder="Cole a URL da lista M3U"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
        />
        <button onClick={() => carregarListaM3U(url)} style={{ width: "100%", marginBottom: "10px", padding: "10px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "5px" }}>Carregar via Link</button>

        <h4>Carregar via Login</h4>
        <input
          type="text"
          placeholder="Login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
        />
        <input
          type="text"
          placeholder="URL do Servidor"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
        />
        <button onClick={carregarListaComLogin} style={{ width: "100%", marginBottom: "10px", padding: "10px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "5px" }}>Carregar via Login</button>

        <h4>Carregar arquivo M3U</h4>
        <input type="file" accept=".m3u" onChange={carregarArquivo} style={{ width: "100%", marginBottom: "10px" }} />

        {loading && <p>Carregando lista... {progresso}%</p>}

        {Object.entries(canaisFiltrados).map(([categoria, canaisCategoria]) => (
          <div key={categoria}>
            <h5>{categoria}</h5>
            <ul>
              {canaisCategoria.map((canal, index) => (
                <li key={index}>
                  <button
                    onClick={() => setSelecionado(canal)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "5px",
                      margin: "5px 0",
                      backgroundColor: "#374151",
                      color: "#fff",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer"
                    }}
                  >
                    {canal.nome}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ width: "70%", padding: "20px", backgroundColor: "#111827", color: "#fff" }}>
        {loading ? (
          <p>Carregando lista... {progresso}%</p>
        ) : selecionado ? (
          <div>
            <h3>{selecionado.nome}</h3>
            <video ref={videoRef} controls style={{ width: "100%", height: "500px", border: "2px solid #fff", borderRadius: "10px" }} />
          </div>
        ) : (
          <p>Selecione um canal para assistir.</p>
        )}
      </div>
    </div>
  );
};

export default App;
