# Doop MCP (Model Context Protocol) Mimari ve Çalışma Prensipleri

Doop, insanlarla yapay zekâ ajanlarının aynı tuval üzerinde gerçek zamanlı (multiplayer) olarak birlikte web/arayüz tasarladığı HTML tabanlı bir platformdur.

Bu belgede Doop içerisindeki **MCP (Model Context Protocol)** mimarisi, kimlik doğrulama adımları, canlı tuval entegrasyonu, tasarım akışı ve araç ekosistemi detaylandırılmıştır.

---

## 1. Genel Mimari ve Taşıma Katmanı (Transport)

Doop, Anthropic'in resmi TypeScript SDK'sını (`@modelcontextprotocol/sdk`) kullanır.

- **SDK Bileşenleri:** `McpServer`, `StreamableHTTPServerTransport`
- **İlgili Dosyalar:**
  - Sunucu Tanımları ve Araçlar: [`server/mcp.ts`](file:///home/personal/Projects/doop/doop/server/mcp.ts)
  - Rota ve Dinleme: [`server/index.ts`](file:///home/personal/Projects/doop/doop/server/index.ts#L1580)
  - Eylemler ve Olay Yayını: [`server/actions.ts`](file:///home/personal/Projects/doop/doop/server/actions.ts)
- **Uç Nokta (Endpoint):** `POST /mcp`
- **Protokol:** **Streamable HTTP (Stateless)**. Her gelen POST isteğinde kullanıcı ve oturum bilgisine göre `buildMcpServer(owner, ownerId)` çağrılarak geçici bir `McpServer` örneği oluşturulur.

### İstek ve Veri Akış Şeması

```text
[Claude Code / Codex / Cursor / Dış Ajan]
                    │ (Streamable HTTP / JSON-RPC over POST)
                    ▼
          Express: POST /mcp (handleMcpRequest)
                    │
                    ├──> [OAuth 2.0 Doğrulama (RFC 9728)]
                    │
                    ▼
          buildMcpServer(owner, ownerId)
                    │
    ┌───────────────┴───────────────┐
    ▼                               ▼
actions.ts (Mutasyonlar)        store.ts (Kalıcı/Geçici Hafıza)
    │                               │
    ▼ (WebSocket broadcast)         ▼
[Tarayıcıdaki Kullanıcılar - Canlı Render & Cursors]
```

---

## 2. Kimlik Doğrulama ve Güvenlik: İkili Doğrulama (Dual-Auth)

Doop MCP sunucusu iki farklı yetkilendirme modunu eşzamanlı olarak destekler:

### A. Kişisel Erişim Anahtarları (Personal Access Tokens / API Keys)

Cursor, Windsurf, Claude Desktop, CI/CD betikleri ve tarayıcı onayını desteklemeyen araçlar için kullanıcılar `/settings` veya tuval içi `Connect an AI agent` modalından tek tıkla kalıcı Bearer token üretebilir:

- **Token Formatı:** `doop_pat_<entropy>`
- **Saklama Güvenliği:** Ham anahtar sadece üretim anında bir kez gösterilir; veritabanında (`mcp_api_keys`) yalnızca **SHA-256 özeti** saklanır.
- **Kullanım:** İstemci isteğinde `Authorization: Bearer doop_pat_...` veya `X-API-Key: doop_pat_...` başlığı ile iletilir.
- **Yönetim:** Kullanıcılar `/settings` altındaki "MCP Access Tokens" sekmesinden anahtarları adlandırabilir, son kullanma sürelerini ayarlayabilir ve diledikleri an anında iptal edebilir (revoke).

### B. OAuth 2.0 / RFC 9728 (Tarayıcı Onaylı İstemciler)

Claude Code veya Codex gibi etkileşimli istemciler için standart OAuth keşif akışı:

1. **Keşif ve 401 Yanıtı:**
   İstemci `/mcp` uç noktasına henüz yetkisizken istek attığında sunucu `401 Unauthorized` döner ve başlık ekler:
   ```http
   WWW-Authenticate: Bearer realm="doop", resource_metadata="https://<host>/.well-known/oauth-protected-resource/mcp"
   ```
2. **Metadata Uç Noktası:**
   `/.well-known/oauth-protected-resource/mcp` adresinde kaynak yetkilendirme sunucuları ve JWKS bilgisi sunulur:
   - Kaynak: `https://<host>/mcp`
   - Yetkilendirme Sunucusu: `PUBLIC_ORIGIN`
   - Algoritmalar: `RS256`
3. **Kullanıcı Onayı:**
   İstemci tarayıcıda bir onay penceresi açar. Kullanıcı onayladığında Better-Auth üzerinden geçerli bir erişim belirteci oluşturulur.
4. **Kullanıcı İzolasyonu:**
   Ajan bağlandığında bağlanan kullanıcının yetkileriyle (`canAccessCanvas(ownerId, canvas)`) sınırlıdır. Yalnızca kullanıcının erişebildiği kişisel veya paylaşımlı çalışma alanı (workspace) tuvallerini görebilir ve düzenleyebilir.

---

## 3. Çok Oyunculu (Multiplayer) Entegrasyon ve "Presence"

Ajanlar sisteme sadece bir API çağrısı yapmaz; tuval üzerinde birer kullanıcı gibi canlı olarak bulunurlar:

- **Odaya Katılma (Heartbeat & Join):** Ajan tuval kapsamlı bir aracı çağırdığında veya `agent_name` parametresi geçtiğinde `arrive(canvasId, agent_name)` çalışır.
- **WebSocket Yayını:** Express WebSocket sunucusu o tuvaldeki tüm tarayıcılara `presence:join` mesajı gönderir. Kullanıcılar ajanın adını, avatarını ve rengini anında görür.
- **Canlı Durum (`set_status`):** Ajan ne yaptığını bildirdiğinde (ör. `"Designing a pricing page, dark editorial style"`), bu durum üst çubukta ajanın isminin yanında canlı gösterilir.
- **Zaman Aşımı:** Ajan 20-60 saniye boyunca yeni bir çağrı yapmazsa arka plan zamanlayıcısı `presence:leave` yayınlayarak ajanın ayrıldığını bildirir.

---

## 4. Gerçek Zamanlı Tasarım Akışı (HTML Streaming)

Yapay zekâ büyük bir HTML belgesini tek seferde göndermek yerine **`append_frame_html`** aracını kullanır:

1. **Bölüm Bölüm Gönderim:** HTML belge sırasına göre 1–4 KB'lık parçalar halinde gönderilir. İlk parçada `start: true`, son parçada `done: true` iletilir.
2. **Kısmi HTML Onarımı:** Sunucu tarafında `healPartialHtml()` devreye girerek henüz kapanmamış etiketleri geçici olarak tamamlar.
3. **Canlı Boyama (Live Paint):** Her parça geldiği anda WebSocket üzerinden tarayıcılara `frame:updated` bildirilir. İnsanlar ajanın web sayfasını satır satır inşa edişini canlı olarak izler.
4. **Hassas Düzenlemeler (`edit_frame_html`):** Küçük revizeler için bütün kodu yeniden göndermek yerine tekil eşleşen metin parçası için tam find-and-replace yapılır.

---

## 5. Çift Yönlü İletişim ve Geri Besleme Döngüleri (Feedback Loops)

MCP istemci-çekmeli (pull-based) bir protokol olduğu için sunucu ajana doğrudan push bildirimi yapamaz. Doop bu kısıtı aşağıdaki yöntemlerle aşmıştır:

### A. İnsan Geri Bildirimlerinin Enjeksiyonu (`withFeedback`)

Kullanıcı tuval üzerinde ajana bir not veya yorum yazdığında bu kuyruğa alınır. Ajan bir sonraki MCP aracı çağrısını yaptığında, dönen yanıtın içerisine otomatik olarak şu blok eklenir:

```text
HUMAN FEEDBACK — open request(s) on this canvas, now assigned to YOU:
- User: "Header'daki logonun rengini beyaz yap ve menü aralıklarını daralt."
Address this NOW, before continuing your plan...
```

### B. Görsel Doğrulama (`get_frame_screenshot`)

Ajanların görme yetisi olmasını sağlamak için sunucu tarafında Playwright/Headless Chromium ile çerçevenin retina kalitesinde ekran görüntüsü alınır ve MCP aracından `image/png` (base64) blok olarak döndürülür. Ajan tasarımını gözle inceleyip düzenlemelerini buna göre yapar.

### C. Davranış Yönlendirmeleri (Nudges)

- **`REVIEW_NUDGE`**: Yeni bir tasarım oluştuktan sonra ajana mutlaka ekran görüntüsünü kontrol etmesini hatırlatır.
- **`withStatusNudge`**: Ajan görevini bildirmeden çalışmaya başladıysa durumunu güncellemesini ister.
- **`withGuidelinesNudge`**: Tuvalde henüz okunmamış marka/stil kılavuzları varsa ajana bunları okumasını zorunlu tutar.

---

## 6. MCP Araç Kataloğu (Tool Catalog)

[`server/mcp.ts`](file:///home/personal/Projects/doop/doop/server/mcp.ts) dosyasında kayıtlı temel araçlar şunlardır:

| Kategori                | Araç Adı                            | Açıklama                                                            |
| :---------------------- | :---------------------------------- | :------------------------------------------------------------------ |
| **Kılavuz & İlham**     | `get_guide`                         | Doop tasarım prensipleri ve çalışma kurallarını okur.               |
|                         | `search_inspiration`                | Canlı sitelerden ekran görüntüleri ve stil kuralları getirir.       |
|                         | `get_guidelines` / `set_guidelines` | Tuvaldeki stil rehberlerini okur ve günceller.                      |
|                         | `save_decision`                     | İnsanın tasarım tercihlerini tuval hafızasına kaydeder.             |
| **Tuval & Çerçeve**     | `list_canvases`                     | Kullanıcının erişebildiği tüm tuvalleri listeler.                   |
|                         | `create_canvas`                     | Yeni bir tasarım tuvali oluşturur.                                  |
|                         | `get_canvas`                        | Tuvalin tüm çerçeve ve metaveri özetini döner.                      |
|                         | `create_frame`                      | Yeni bir artboard/çerçeve ekler.                                    |
|                         | `get_frame`                         | Çerçevenin tam HTML kodunu getirir.                                 |
|                         | `update_frame`                      | Çerçevenin boyutunu, konumunu veya adını günceller.                 |
|                         | `delete_frame`                      | Çerçeveyi siler.                                                    |
| **Tasarım & Kod**       | `append_frame_html`                 | Tasarımı bölüm bölüm canlı akışla çerçeveye yazar.                  |
|                         | `set_frame_html`                    | Çerçevenin HTML içeriğini tek seferde değiştirir.                   |
|                         | `edit_frame_html`                   | Çerçeve HTML'i üzerinde tam eşleşmeli find/replace yapar.           |
| **Görseller & Medya**   | `search_images`                     | Pexels üzerinden küçük resimlerle stok fotoğraf arar.               |
|                         | `search_icons`                      | 200k+ UI ikonunu SVG formatında arar.                               |
|                         | `search_logos`                      | Şirket ve marka logolarını vektörel/temiz formatta bulur.           |
|                         | `list_backgrounds`                  | Seçilmiş mesh gradient ve arka plan galerisini sunar.               |
|                         | `generate_image`                    | Prompt ile kalıcı yeni görsel üretir.                               |
|                         | `upload_asset`                      | Uzak bir URL'yi veya yerel dosyayı kalıcı asset'e dönüştürür.       |
| **İnceleme & Klonlama** | `get_frame_screenshot`              | Çerçevenin anlık PNG ekran görüntüsünü döndürür.                    |
|                         | `view_website`                      | Harici bir web sitesini salt-okunur analiz eder.                    |
|                         | `import_webpage`                    | Harici bir web sayfasını düzenlenebilir HTML olarak tuvale aktarır. |
| **İletişim & Görev**    | `set_status`                        | Ajanın anlık çalışma özetini panoya yansıtır.                       |
|                         | `get_comments`                      | Tuvaldeki raptiyeli yorumları listeler.                             |
|                         | `reply_to_comment`                  | Yorum dizisine cevap verir.                                         |
|                         | `resolve_comment`                   | Çözülen yorumu kapatır.                                             |
|                         | `get_feedback`                      | İnsanlardan gelen bekleyen geri bildirimleri kontrol eder.          |

---

## 7. İstemci Bağlantı Komutları

Bir yapay zekâ istemcisini Doop tuvaline bağlamak için kullanılan standart yapılandırmalar:

### Claude Code

```bash
claude mcp add --transport http doop "https://<doop-url>/mcp"
```

### Codex

```bash
codex mcp add doop --url "https://<doop-url>/mcp"
```

### Standart `mcpServers` JSON Yapılandırması (Cursor / Cline / vb.)

```json
{
  "mcpServers": {
    "doop": {
      "type": "http",
      "url": "https://<doop-url>/mcp"
    }
  }
}
```

### Başlangıç Prompt Önerisi

```text
Work on Doop canvas <canvas_id>. Start with get_guide({ topic: "doop-instructions" }) and follow it.
```

---

## 8. Yerel Ajan (Local Agent - Desktop App)

Tauri ile geliştirilen masaüstü uygulamasında (`desktop/src-tauri/src/claude.rs`), kullanıcının makinesindeki `claude` CLI aracı otomatik olarak çalıştırılabilir.

- Sunucu, masaüstü uygulaması için kısa ömürlü ve izole bir token üretir.
- Claude CLI, izole `/local-agent/mcp/:id` uç noktasına bağlanarak kullanıcının yerel Claude aboneliğini tuval üzerinde çalıştırır.
