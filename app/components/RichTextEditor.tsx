"use client";

import {
  type ClipboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";

function escaparHtml(texto: string) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function pareceHtml(valor: string) {
  return /<\/?[a-z][\s\S]*>/i.test(valor);
}

function textoParaHtml(texto: string) {
  return texto
    .split(/\n{2,}/)
    .map((bloco) => `<p>${escaparHtml(bloco).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const TAGS_PERMITIDAS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "li",
  "ol",
  "p",
  "s",
  "span",
  "strike",
  "strong",
  "u",
  "ul",
]);

const ESTILOS_PERMITIDOS = new Set([
  "font-style",
  "font-weight",
  "text-align",
  "text-decoration",
]);

export function normalizarConteudoEditor(conteudo: string) {
  if (!conteudo.trim()) return "";
  return pareceHtml(conteudo) ? conteudo : textoParaHtml(conteudo);
}

export function sanitizarHtmlBasico(html: string) {
  if (!html.trim()) return "";

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
      .replace(/\s(?:href|src|xlink:href)=["']?\s*(?:javascript|data|vbscript):[^"'\s>]*/gi, "");
  }

  const documento = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  limparNoHtml(documento.body);
  return documento.body.innerHTML;
}

function limparNoHtml(no: Node) {
  Array.from(no.childNodes).forEach((filho) => {
    if (filho.nodeType === Node.COMMENT_NODE) {
      filho.remove();
      return;
    }

    if (filho.nodeType !== Node.ELEMENT_NODE) return;

    const elemento = filho as HTMLElement;
    const tag = elemento.tagName.toLowerCase();

    if (!TAGS_PERMITIDAS.has(tag)) {
      const pai = elemento.parentNode;
      while (elemento.firstChild) {
        const neto = elemento.firstChild;
        pai?.insertBefore(neto, elemento);
        limparNoHtml(neto);
      }
      elemento.remove();
      return;
    }

    Array.from(elemento.attributes).forEach((atributo) => {
      const nome = atributo.name.toLowerCase();
      const valor = atributo.value.trim();

      if (nome.startsWith("on") || nome === "srcdoc" || nome === "src" || nome === "xlink:href") {
        elemento.removeAttribute(atributo.name);
        return;
      }

      if (tag === "a" && nome === "href") {
        if (urlPermitida(valor)) {
          elemento.setAttribute("href", valor);
          elemento.setAttribute("target", "_blank");
          elemento.setAttribute("rel", "noopener noreferrer");
        } else {
          elemento.removeAttribute("href");
        }
        return;
      }

      if (nome === "style") {
        const estiloSeguro = sanitizarEstilo(valor);
        if (estiloSeguro) {
          elemento.setAttribute("style", estiloSeguro);
        } else {
          elemento.removeAttribute("style");
        }
        return;
      }

      elemento.removeAttribute(atributo.name);
    });

    limparNoHtml(elemento);
  });
}

function urlPermitida(url: string) {
  if (!url) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;

  try {
    return ["http:", "https:", "mailto:", "tel:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function sanitizarEstilo(style: string) {
  return style
    .split(";")
    .map((declaracao) => {
      const [propriedade, ...valorPartes] = declaracao.split(":");
      const nome = propriedade?.trim().toLowerCase();
      const valor = valorPartes.join(":").trim();

      if (!nome || !valor || !ESTILOS_PERMITIDOS.has(nome)) return "";
      if (/url\s*\(|expression\s*\(|javascript:/i.test(valor)) return "";

      return `${nome}: ${valor}`;
    })
    .filter(Boolean)
    .join("; ");
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  editorLabel = "Editor de texto",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editorLabel?: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selecaoRef = useRef<Range | null>(null);
  const [estadoToolbar, setEstadoToolbar] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    editor.innerHTML = sanitizarHtmlBasico(normalizarConteudoEditor(value));
  }, [value]);

  function salvarSelecaoAtual() {
    const editor = editorRef.current;
    const selecao = window.getSelection();
    if (!editor || !selecao || selecao.rangeCount === 0) return;

    const noAtual = selecao.anchorNode;
    if (noAtual && editor.contains(noAtual)) {
      selecaoRef.current = selecao.getRangeAt(0).cloneRange();
    }
  }

  function restaurarSelecao() {
    const selecao = window.getSelection();
    const selecaoSalva = selecaoRef.current;
    if (!selecao || !selecaoSalva) return;

    selecao.removeAllRanges();
    selecao.addRange(selecaoSalva);
  }

  function atualizarEstadoToolbar() {
    try {
      setEstadoToolbar({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
      });
    } catch {
      // Alguns navegadores não informam estado de seleção em contentEditable.
    }
  }

  function atualizarValor() {
    salvarSelecaoAtual();
    const editor = editorRef.current;
    onChange(sanitizarHtmlBasico(editor?.innerHTML || ""));
    atualizarEstadoToolbar();
  }

  function aplicarComando(comando: string, valor?: string) {
    const editor = editorRef.current;
    editor?.focus();
    restaurarSelecao();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(comando, false, valor);
    atualizarValor();
    editor?.focus();
  }

  function aplicarAlinhamento(alinhamento: "left" | "center" | "right" | "justify") {
    const editor = editorRef.current;
    editor?.focus();
    restaurarSelecao();

    const blocos = obterBlocosSelecionados(editor);
    if (blocos.length === 0) {
      aplicarComando(
        `justify${
          alinhamento === "left"
            ? "Left"
            : alinhamento === "center"
              ? "Center"
              : alinhamento === "right"
                ? "Right"
                : "Full"
        }`
      );
      return;
    }

    blocos.forEach((bloco) => {
      bloco.style.textAlign = alinhamento;
    });
    atualizarValor();
    editor?.focus();
  }

  function criarLink() {
    const url = window.prompt("Cole o link completo:");
    if (!url?.trim()) return;

    const link = url.trim();
    if (!urlPermitida(link)) {
      window.alert("Informe um link seguro começando com http://, https://, mailto: ou tel:.");
      return;
    }

    aplicarComando("createLink", link);
  }

  function colarTextoLimpo(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const texto = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, texto);
    atualizarValor();
  }

  function prevenirPerdaDeSelecao(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    salvarSelecaoAtual();
  }

  return (
    <div className="modelos-rich-editor-shell rich-text-editor-shell">
      <div className="modelos-editor-toolbar" aria-label="Formatação do texto">
        <div className="modelos-toolbar-group">
          <EditorToolButton label="↶" title="Desfazer" onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarComando("undo")} />
          <EditorToolButton label="↷" title="Refazer" onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarComando("redo")} />
        </div>

        <select
          aria-label="Estilo do texto"
          className="modelos-toolbar-select"
          defaultValue="P"
          onChange={(event) => {
            aplicarComando("formatBlock", event.target.value);
            event.target.value = "P";
          }}
          onFocus={salvarSelecaoAtual}
          onMouseDown={salvarSelecaoAtual}
        >
          <option value="P">Formatos</option>
          <option value="H2">Título</option>
          <option value="H3">Subtítulo</option>
          <option value="BLOCKQUOTE">Citação</option>
        </select>

        <div className="modelos-toolbar-group">
          <EditorToolButton label="B" title="Negrito" active={estadoToolbar.bold} onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarComando("bold")} />
          <EditorToolButton label="I" title="Itálico" active={estadoToolbar.italic} className="is-italic" onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarComando("italic")} />
          <EditorToolButton label="U" title="Sublinhado" active={estadoToolbar.underline} className="is-underline" onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarComando("underline")} />
          <EditorToolButton label="S" title="Tachado" active={estadoToolbar.strikeThrough} className="is-strike" onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarComando("strikeThrough")} />
        </div>

        <div className="modelos-toolbar-group">
          <EditorToolButton label="≡" title="Alinhar à esquerda" onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarAlinhamento("left")} />
          <EditorToolButton label="≣" title="Centralizar" onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarAlinhamento("center")} />
          <EditorToolButton label="≡" title="Alinhar à direita" className="align-right-icon" onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarAlinhamento("right")} />
          <EditorToolButton label="☰" title="Justificar" onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarAlinhamento("justify")} />
        </div>

        <div className="modelos-toolbar-group">
          <EditorToolButton label="•" title="Lista com marcadores" onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarComando("insertUnorderedList")} />
          <EditorToolButton label="1." title="Lista numerada" onMouseDown={prevenirPerdaDeSelecao} onClick={() => aplicarComando("insertOrderedList")} />
          <EditorToolButton label="⌁" title="Inserir link" onMouseDown={prevenirPerdaDeSelecao} onClick={criarLink} />
        </div>
      </div>

      <div
        ref={editorRef}
        className="modelos-rich-editor"
        role="textbox"
        aria-label={editorLabel}
        dir="ltr"
        tabIndex={0}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || ""}
        onInput={atualizarValor}
        onBlur={atualizarValor}
        onKeyUp={() => {
          salvarSelecaoAtual();
          atualizarEstadoToolbar();
        }}
        onMouseUp={() => {
          salvarSelecaoAtual();
          atualizarEstadoToolbar();
        }}
        onFocus={atualizarEstadoToolbar}
        onPaste={colarTextoLimpo}
      />
    </div>
  );
}

function obterBlocosSelecionados(editor: HTMLDivElement | null) {
  const selecao = window.getSelection();
  if (!editor || !selecao || selecao.rangeCount === 0) return [];

  const range = selecao.getRangeAt(0);
  const noAtual =
    selecao.anchorNode?.nodeType === Node.ELEMENT_NODE
      ? (selecao.anchorNode as HTMLElement)
      : selecao.anchorNode?.parentElement;
  const blocoAtual = noAtual?.closest<HTMLElement>(
    "p, div, h1, h2, h3, h4, h5, h6, li, blockquote"
  );

  if (range.collapsed && blocoAtual && editor.contains(blocoAtual)) {
    return [blocoAtual];
  }

  const blocos = Array.from(
    editor.querySelectorAll<HTMLElement>(
      "p, div, h1, h2, h3, h4, h5, h6, li, blockquote"
    )
  ).filter((elemento) => range.intersectsNode(elemento));

  if (blocos.length > 0) return blocos;

  return blocoAtual && editor.contains(blocoAtual) ? [blocoAtual] : [];
}

function EditorToolButton({
  label,
  title,
  active,
  className = "",
  onMouseDown,
  onClick,
}: {
  label: string;
  title: string;
  active?: boolean;
  className?: string;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`modelos-toolbar-button${active ? " is-active" : ""}${
        className ? ` ${className}` : ""
      }`}
      title={title}
      data-tooltip={title}
      aria-label={title}
      aria-pressed={active || undefined}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
