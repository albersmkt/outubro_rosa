# Outubro Rosa — Totem 9:16

Site educativo em português, baseado nas oito telas do PDF fornecido. Preserva a arte da campanha e apresenta as seis perguntas com texto HTML e botões de toque. Desenvolvido com a skill `emil-design-eng` do projeto.

## Executar

Requer Node.js 20.19+ ou 22.12+.

```sh
npm ci
npm run dev
```

## Produção

```sh
npm run build
npm run preview
```

As telas educativas usam imagens e fontes locais. O recurso opcional de selfie usa a função `api/selfie.js` e um Vercel Blob privado: para esse recurso, publique o projeto completo no Vercel. Uma hospedagem apenas estática permite navegar pelas perguntas, mas não permite compartilhar selfies entre aparelhos. É necessário carregar o site pelo servidor; não abra o HTML diretamente por `file://`.

### Vercel

Após enviar os arquivos ao GitHub, no Vercel selecione **Add New → Project**, importe `albersmkt/outubro_rosa` e clique em **Deploy**. A configuração `vercel.json` seleciona Vite, executa `npm run build` e publica `dist/`. Use o endereço HTTPS gerado pelo Vercel para abrir o site no computador ou na TV.

Para habilitar o download das selfies:

1. No painel do projeto, abra **Storage** e crie/conecte um **Vercel Blob privado**. Não use um armazenamento público.
2. Confirme que a conexão adicionou `BLOB_READ_WRITE_TOKEN` às variáveis do projeto para Production (e Preview se for testar nesse ambiente). Nunca exponha esse token no frontend ou adicione um prefixo `VITE_`.
3. Faça um novo deploy para que a função receba a variável.
4. No navegador do totem, permita o uso da webcam. Ela precisa estar conectada ao computador que executa o navegador. Use Chrome ou Edge atualizado em HTTPS.
5. Percorra as perguntas, escolha **Tirar uma selfie**, toque em **Tirar foto** e aguarde a contagem de **5 segundos** para se posicionar. Confira a foto e confirme **Gerar QR Code para baixar**. Leia o QR com um celular e confira o download. Esse teste real depende do armazenamento configurado e de uma webcam física.

O Blob pode gerar cobrança conforme o uso na sua conta Vercel. Sem a variável, as telas educativas e a captura local continuam disponíveis; o envio apresenta uma mensagem de configuração pendente.

Se o QR não é gerado e o download aparece indisponível, confira a variável `BLOB_READ_WRITE_TOKEN` em **Settings → Environment Variables**, no ambiente do deploy que está sendo usado. Conectar o Blob depois de um deploy não injeta a variável naquele deploy: execute **Redeploy** após conectar. Se a conexão do Storage oferecer outro prefixo para a variável, escolha o prefixo padrão `BLOB`.

Para testar a API, execute `npm test`. `npm run dev` e `npm run preview` servem somente o frontend: a função é executada pelo Vercel. Testes locais da API com credenciais reais exigem um ambiente Vercel configurado.

## Uso no totem

Configure a TV em orientação vertical e abra o navegador em modo kiosk/tela cheia. A área útil mantém 9:16 (referência: 1080 × 1920), sem cortes e sem rolagem. Em telas com outra proporção, aparecem margens.

Toque em “Toque na tela!” para começar e em “Clique aqui!” para avançar. “Voltar” retorna à tela anterior e “Início” reinicia. No encerramento, escolha **Tirar uma selfie** ou **Não, obrigado · Voltar ao início**. Setas do teclado navegam pelas telas educativas; Escape e Home retornam ao início, inclusive durante a selfie.

Após 90 segundos sem interação nas perguntas, a sessão retorna à abertura. O encerramento permanece por 20 segundos e também retorna à abertura. Os tempos estão em `src/main.js`. A câmera/confirmacão aguarda até 90 segundos; após gerar o QR Code, a tela retorna à abertura em **45 segundos**, com contador visível. Os tempos da selfie estão em `src/selfie.js`. A câmera é desligada após a captura, ao sair da selfie ou ao ocultar a aba. A foto local e sua URL temporária são descartadas ao reiniciar a sessão. A página de download no celular não reinicia automaticamente.

### Fotos temporárias

A imagem baixada é um JPEG vertical **1080 × 1920** com o lettering original da campanha, fundo e moldura rosa, selfie central e as frases “Se toca, mulher!” e “Informação também é prevenção”. A identidade está gravada nos pixels da foto, inclusive no arquivo baixado pelo celular. O enquadramento da webcam é preservado sem cortes.

Apenas após confirmar **Gerar QR Code para baixar**, a imagem JPEG (até 2 MB) é enviada ao armazenamento privado. O QR contém um link com identificador aleatório, que permite a quem o possui baixar a foto por **15 minutos**, inclusive após o totem voltar ao início. A API bloqueia links vencidos, não envia a URL privada do Blob ao navegador e impede cache da foto.

A expiração do link não é uma exclusão agendada: fotos vencidas são excluídas quando alguém tenta acessar o link ou quando a próxima selfie é enviada. Se não houver novos acessos/uploads, os arquivos ficam no armazenamento privado, sem acesso pela API; ao encerrar o evento, exclua os arquivos da pasta `outubro-rosa-selfies/` pelo painel Storage. Não existe galeria pública e nenhum outro dado do visitante é solicitado.

### Movimento e disposição

As camadas decorativas têm um efeito de profundidade/parallax nas trocas de tela e no movimento do mouse, com movimento reduzido quando solicitado pelo navegador. Textos, botões, enquadramento da câmera e QR Code não acompanham o mouse. As telas da selfie reservam áreas separadas para cabeçalho, foto/conteúdo, ações e rodapé. A contagem pode ser cancelada por **Voltar ao início** ou Escape, desligando a câmera e cancelando a captura pendente.

### Diagnóstico do compartilhamento

Abra `/api/selfie?status=1` no domínio do deploy para verificar apenas a presença de autenticação (`configured` e `authentication`), sem mostrar nenhum valor de credencial. `configured: true` informa que há uma configuração; não comprova que o token tem acesso ao Blob privado. A API aceita `BLOB_READ_WRITE_TOKEN` ou a combinação de `BLOB_STORE_ID` com `VERCEL_OIDC_TOKEN` fornecida pela plataforma. Uma resposta 503 ao upload significa ausência da configuração. Uma resposta 502 indica falha ao acessar o armazenamento; confira o vínculo, o tipo privado do Blob e a permissão da credencial no Vercel.

Também é reconhecida uma única conexão de Blob com prefixo personalizado (por exemplo, `ROSA_BLOB_READ_WRITE_TOKEN`). Havendo vários tokens sem uma variável padrão, o diagnóstico informa `MULTIPLE_BLOB_BINDINGS`: nesse caso, escolha explicitamente o armazenamento da campanha com `BLOB_READ_WRITE_TOKEN`. O diagnóstico mostra somente nomes das variáveis e o identificador do commit do deploy, nunca valores de credenciais.

## Conteúdo e arte

Perguntas e respostas estão em `src/main.js`. Imagens derivadas do PDF enviado estão em `public/assets/`. O conteúdo educativo foi transcrito do modelo fornecido, incluindo as faixas etárias; não foi feita revisão clínica independente. Antes de exposição pública, o responsável pela campanha deve revisar o conteúdo e os direitos de uso das imagens. Os arquivos separados mencionados ainda não foram recebidos.

As telas de abertura e encerramento preservam a composição do PDF como imagens e oferecem texto equivalente para leitores de tela. As perguntas são texto editável. Os botões têm foco visível, suporte ao teclado e respeito à preferência de movimento reduzido.
