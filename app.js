// Tela do Mercado do Pai: ofertas, listas por mercado, comparativo e "peguei".
(function () {
  const L = window.Logica, $ = (id) => document.getElementById(id);
  const CHAVE_PEGOS = "mp_pegos", CHAVE_DADOS = "mp_precos";
  let dados = null, aberto = null;

  const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let pegos = new Set(ler(CHAVE_PEGOS, []));
  const salvarPegos = () => gravar(CHAVE_PEGOS, [...pegos]);

  const nomeM = (m) => dados.mercados[m].nome;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const porUnidade = (i) => (/\(kg\)/.test(i.nome) ? " /kg" : "");

  function linha(i) {
    const b = L.melhorMercado(i), pego = pegos.has(i.id);
    return `<li><button class="item${pego ? " pego" : ""}" data-id="${i.id}">
      <span class="ic" aria-hidden="true">${i.icone}</span>
      <span class="nm">${esc(i.nome)}${b.economia > 0 ? `<span class="marca">${esc(nomeM(b.outro))}: ${L.reais(b.precoOutro)}</span>` : ""}</span>
      <span class="pr">${L.reais(b.preco)}${porUnidade(i)}</span></button></li>`;
  }

  function desenhar() {
    const listas = L.montarListas(dados), of = L.ofertas(dados);
    let h = "";
    if (of.length) {
      h += `<h2 class="secao">🔥 Ofertas</h2><div class="ofertas">` + of.map((i) => {
        const b = L.melhorMercado(i), p = i.precos[b.mercado];
        return `<button class="oferta" data-id="${i.id}"><div class="ic" aria-hidden="true">${i.icone}</div>
          <div class="nm">${esc(i.nome)}</div><div class="era">${L.reais(p.de)}</div>
          <div class="pr">${L.reais(p.por)}</div><span class="selo ${b.mercado}">${esc(nomeM(b.mercado))}</span></button>`;
      }).join("") + `</div>`;
    }
    for (const m of L.ORDEM) {
      const itens = listas[m];
      if (!itens.length) continue;
      const faltam = itens.filter((i) => !pegos.has(i.id)), feitos = itens.filter((i) => pegos.has(i.id));
      h += `<div class="faixa ${m}">Comprar no ${esc(nomeM(m)).toUpperCase()}<small>${faltam.length ? `Faltam ${faltam.length} de ${itens.length}` : "Tudo pego ✓"}</small></div>
        <ul class="lista">${faltam.concat(feitos).map(linha).join("")}</ul>`;
    }
    h += `<div class="rodape">${pegos.size ? `<button id="nova" class="botao claro">Começar lista nova</button>` : ""}
      <p class="aviso">Toque num item para ver o preço nos dois mercados.</p></div>`;
    $("conteudo").innerHTML = h;
    $("data").textContent = "Preços de " + L.dataCurta(dados.atualizado);
  }

  function abrir(id) {
    const i = dados.itens.find((x) => x.id === id); if (!i) return;
    aberto = i;
    const b = L.melhorMercado(i);
    $("c-icone").textContent = i.icone;
    $("c-nome").textContent = i.nome;
    $("c-precos").innerHTML = L.ORDEM.map((m) => {
      const p = i.precos[m];
      return `<div class="c-caixa ${m}${m === b.mercado ? " melhor" : ""}"><div class="m">${esc(nomeM(m))}</div>
        <div class="v">${p ? L.reais(p.por) : "—"}</div><div class="s">${p ? (m === b.mercado && b.outro ? "mais barato" : p.de ? "era " + L.reais(p.de) : "") : "sem preço"}</div></div>`;
    }).join("");
    $("c-frase").textContent = b.outro
      ? (b.economia > 0 ? `Compre no ${nomeM(b.mercado)}: economiza ${L.reais(b.economia)}` : "Mesmo preço nos dois")
      : `Só temos o preço do ${nomeM(b.mercado)}`;
    $("c-peguei").textContent = pegos.has(i.id) ? "Desmarcar" : "✓ Já peguei";
    $("comparar").showModal();
  }

  document.addEventListener("click", (e) => {
    const alvo = e.target.closest("[data-id]");
    if (alvo) return abrir(alvo.dataset.id);
    if (e.target.id === "nova" && confirm("Começar uma lista nova? Os itens marcados voltam para a lista.")) {
      pegos.clear(); salvarPegos(); desenhar();
    }
  });
  $("c-fechar").onclick = () => $("comparar").close();
  $("c-peguei").onclick = () => {
    if (!aberto) return;
    pegos.has(aberto.id) ? pegos.delete(aberto.id) : pegos.add(aberto.id);
    salvarPegos(); $("comparar").close(); desenhar();
  };
  $("comparar").addEventListener("click", (e) => { if (e.target === $("comparar")) $("comparar").close(); });

  async function carregar() {
    const guardado = ler(CHAVE_DADOS, null);
    if (L.valido(guardado)) { dados = guardado; desenhar(); }
    try {
      const r = await fetch("precos.json", { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      const novo = await r.json();
      if (!L.valido(novo)) throw new Error("formato");
      dados = novo; desenhar(); gravar(CHAVE_DADOS, novo);
    } catch {
      if (!dados) $("data").textContent = "Sem preços agora. Abra de novo com internet.";
    }
  }
  carregar();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
