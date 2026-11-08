// Tela do Mercado do Pai: lista na ordem das prateleiras (bolinha risca sem mudar de lugar), ofertas do dia e comparativo.
(function () {
  const L = window.Logica, $ = (id) => document.getElementById(id);
  const K = { pegos: "mp_pegos", dados: "mp_precos", lista: "mp_lista", ofertas: "mp_ofertas", aba: "mp_aba", extras: "mp_extras" };
  let dados = null, of = null, ofFalhou = false, aberto = null, aba = "lista";

  const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const lerLista = (k) => { const v = ler(k, null); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : null; };
  let pegos = new Set(lerLista(K.pegos) || []), lista = lerLista(K.lista);
  let extras = ler(K.extras, {}); if (!extras || typeof extras !== "object" || Array.isArray(extras)) extras = {};
  aba = ler(K.aba, "lista") === "ofertas" ? "ofertas" : "lista";
  const salvar = () => { gravar(K.pegos, [...pegos]); gravar(K.lista, lista); gravar(K.extras, extras); };
  const hoje = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

  const nomeM = (m) => dados.mercados[m].nome;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const porKg = (nome) => (/\(kg\)/i.test(nome) ? " /kg" : "");

  function linha(it) {
    return `<li class="item${it.pego ? " pego" : ""}">
      <button class="bolinha" data-marca="${esc(it.id)}" aria-pressed="${it.pego}" aria-label="${it.pego ? "Desmarcar" : "Marcar"} ${esc(it.nome)}"><span></span></button>
      <button class="nome" data-abre="${esc(it.id)}"><span class="ic" aria-hidden="true">${it.icone || (it.oferta ? "🔥" : "🛒")}</span>
        <span class="nm">${esc(it.nome)}${it.acabou ? `<span class="acabou">oferta acabou</span>` : ""}</span>${it.preco != null ? `<span class="pr">${L.reais(it.preco)}${porKg(it.nome)}</span>` : ""}</button></li>`;
  }

  function telaLista() {
    const g = L.montarLista(dados, lista, [...pegos], of, hoje(), extras);
    let h = "";
    for (const m of L.ORDEM) {
      const todos = g[m].flatMap((s) => s.itens); if (!todos.length) continue;
      const faltam = todos.filter((i) => !i.pego).length;
      h += `<div class="faixa ${m}">Comprar no ${esc(nomeM(m)).toUpperCase()}<small>${faltam ? `Faltam ${faltam} de ${todos.length}` : "Tudo pego ✓"}</small></div>`;
      for (const s of g[m]) h += `<h3 class="corredor">${esc(s.nome)}</h3><ul class="lista">${s.itens.map(linha).join("")}</ul>`;
    }
    if (g.livres.length) h += `<div class="faixa outros">Outras coisas<small>sem preço</small></div><ul class="lista">${g.livres.map(linha).join("")}</ul>`;
    if (!h) h = `<p class="aviso">A lista está vazia. Toque em “Pôr item”.</p>`;
    h += `<div class="rodape"><button id="por-item" class="botao verde">＋ Pôr item</button>
      ${pegos.size ? `<button id="nova" class="botao claro">Começar lista nova</button>` : ""}
      <p class="aviso">Toque na bolinha quando pegar. Toque no nome para ver o preço nos dois mercados.</p></div>`;
    return h;
  }

  function telaOfertas() {
    const v = L.ofertasValidas(of, hoje());
    let h = of && of.exemplo ? `<p class="aviso alerta">Ofertas de teste. O robô que lê os folhetos ainda não foi ligado.</p>` : "";
    if (of && of.atualizado) h += `<p class="data">Folhetos lidos em ${L.dataCurta(of.atualizado.slice(0, 10))}</p>`;
    let alguma = false;
    for (const m of L.ORDEM) {
      if (!v[m].length) continue; alguma = true;
      h += `<div class="faixa ${m}">Oferta no ${esc(nomeM(m)).toUpperCase()}<small>${v[m].length} produtos hoje</small></div><div class="cartoes">`;
      for (const o of v[m]) {
        const id = L.idOferta(o), c = L.compararOferta(o, of.ofertas, dados, hoje()), naLista = lista.includes(id);
        const comp = c ? `<p class="comp ${c.maisBarato ? "ganha" : "perde"}">No ${esc(nomeM(c.mercado))}: ${L.reais(c.preco)} · ${c.maisBarato ? "aqui é mais barato" : "lá é mais barato"}<span class="comp-nm">${esc(c.nome)}</span></p>` : "";
        h += `<div class="cartao"><div class="nm">${esc(o.produto)}</div><div class="pr">${L.reais(o.preco)}${o.unidade === "kg" ? " /kg" : ""}</div>
          ${o.obs ? `<div class="obs">${esc(o.obs)}</div>` : ""}${comp}
          <button class="botao ${naLista ? "claro" : "verde"}" data-poe="${esc(id)}">${naLista ? "✓ Está na lista" : "＋ Pôr na lista"}</button></div>`;
      }
      h += `</div>`;
    }
    if (!alguma) h += `<p class="aviso">${!of && ofFalhou ? "Não consegui buscar as ofertas agora. Abra de novo com internet." : "Sem ofertas de hoje por enquanto."}</p>`;
    return h;
  }

  function desenhar() {
    if (!dados) return;
    $("conteudo").innerHTML = aba === "lista" ? telaLista() : telaOfertas();
    $("data").textContent = "Preços de " + L.dataCurta(dados.atualizado);
    for (const [b, a] of [["aba-lista", "lista"], ["aba-ofertas", "ofertas"]]) { $(b).classList.toggle("ativa", aba === a); $(b).setAttribute("aria-pressed", aba === a); }
  }

  function abrir(id) {
    const it = L.itemDaLista(id, dados, of, hoje(), extras); if (!it) return;
    aberto = id;
    const cat = dados.itens.find((x) => x.id === id);
    $("c-icone").textContent = it.icone || (it.oferta ? "🔥" : "🛒");
    $("c-nome").textContent = it.nome;
    if (cat) {
      const b = L.melhorMercado(cat);
      $("c-precos").innerHTML = L.ORDEM.map((m) => { const p = cat.precos[m];
        return `<div class="c-caixa ${m}${m === b.mercado ? " melhor" : ""}"><div class="m">${esc(nomeM(m))}</div>
          <div class="v">${p ? L.reais(p.por) : "—"}</div><div class="s">${p ? (m === b.mercado && b.outro ? "mais barato" : p.de ? "era " + L.reais(p.de) : "") : "sem preço"}</div></div>`; }).join("");
      $("c-frase").textContent = b.outro ? (b.economia > 0 ? `Compre no ${nomeM(b.mercado)}: economiza ${L.reais(b.economia)}` : "Mesmo preço nos dois") : `Só temos o preço do ${nomeM(b.mercado)}`;
    } else {
      $("c-precos").innerHTML = "";
      $("c-frase").textContent = it.mercado ? `Oferta do ${nomeM(it.mercado)}: ${L.reais(it.preco)}` : "Item sem preço";
    }
    $("comparar").showModal();
  }

  function sugerir() {
    const t = $("p-busca").value.trim(), n = L.slug(t);
    const fora = dados.itens.filter((i) => !lista.includes(i.id) && (!n || L.slug(i.nome).includes(n)));
    const ofs = n ? (of ? L.ofertasValidas(of, hoje()) : {}) : {};
    const ofList = L.ORDEM.flatMap((m) => (ofs[m] || []).filter((o) => L.slug(o.produto).includes(n) && !lista.includes(L.idOferta(o))));
    let h = fora.slice(0, 8).map((i) => `<button class="sug" data-poe="${esc(i.id)}">${i.icone} ${esc(i.nome)}</button>`).join("");
    h += ofList.slice(0, 4).map((o) => `<button class="sug" data-poe="${esc(L.idOferta(o))}">🔥 ${esc(o.produto)} · ${esc(nomeM(o.mercado))} ${L.reais(o.preco)}</button>`).join("");
    if (t) h += `<button class="sug livre" data-poe="${esc("livre:" + t.slice(0, 40))}">＋ Pôr “${esc(t.slice(0, 40))}”</button>`;
    $("p-sugestoes").innerHTML = h || `<p class="c-frase">Digite o nome do produto.</p>`;
  }

  function poe(id) {
    if (lista.includes(id)) return;
    const it = id.startsWith("of:") && L.itemDaLista(id, dados, of, hoje(), extras);
    if (it) extras[id] = { nome: it.nome, preco: it.preco, mercado: it.mercado, secao: it.secao };
    lista.push(id); salvar();
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.marca) { const id = t.dataset.marca; pegos.has(id) ? pegos.delete(id) : pegos.add(id); salvar(); return desenhar(); }
    if (t.dataset.abre) return abrir(t.dataset.abre);
    if (t.dataset.poe) { poe(t.dataset.poe); if ($("por").open) { $("p-busca").value = ""; sugerir(); } return desenhar(); }
    if (t.id === "por-item") { $("p-busca").value = ""; sugerir(); $("por").showModal(); return; }
    if (t.id === "nova") return $("nova-lista").showModal();
  });
  $("aba-lista").onclick = () => { aba = "lista"; gravar(K.aba, aba); desenhar(); window.scrollTo(0, 0); };
  $("aba-ofertas").onclick = () => { aba = "ofertas"; gravar(K.aba, aba); desenhar(); window.scrollTo(0, 0); };
  $("c-fechar").onclick = () => $("comparar").close();
  $("c-tirar").onclick = () => { lista = lista.filter((x) => x !== aberto); pegos.delete(aberto); delete extras[aberto]; salvar(); $("comparar").close(); desenhar(); };
  $("p-fechar").onclick = () => $("por").close();
  $("p-busca").oninput = sugerir;
  $("n-sim").onclick = () => { pegos.clear(); salvar(); $("nova-lista").close(); desenhar(); };
  $("n-nao").onclick = () => $("nova-lista").close();
  for (const d of ["comparar", "por", "nova-lista"]) $(d).addEventListener("click", (e) => { if (e.target === $(d)) $(d).close(); });

  async function buscar(arq, ok) { const r = await fetch(arq, { cache: "no-cache" }); if (!r.ok) throw new Error(r.status); const j = await r.json(); if (!ok(j)) throw new Error("formato"); return j; }

  async function carregar() {
    const g = ler(K.dados, null), go = ler(K.ofertas, null);
    if (L.valido(g)) dados = g;
    if (L.validarOfertas(go)) of = go;
    if (dados) { if (!lista) lista = L.listaPadrao(dados); desenhar(); }
    try { const novo = await buscar("precos.json", L.valido); dados = novo; gravar(K.dados, novo); }
    catch { if (!dados) { $("data").textContent = "Sem preços agora. Abra de novo com internet."; return; } }
    try { const o = await buscar("ofertas.json", L.validarOfertas); of = o; ofFalhou = false; gravar(K.ofertas, o); } catch { ofFalhou = true; }
    if (!lista) { lista = L.listaPadrao(dados); salvar(); }
    desenhar();
  }
  carregar();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
