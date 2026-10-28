# 🎮 Tahta Arcade — akıllı tahta oyun salonu

**14 dokunmatik retro mini oyun**, hesap açmadan çalışır. HTML/CSS/JavaScript oyunları tamamen tarayıcıda çizilir; oyun sırasında sunucuya bağlanmaları gerekmez. İlk yükleme için internet gerekir. Fare, klavye veya akıllı tahtanın dokunmatiği kullanılabilir.

## Oyunlar

Nokta Avcısı (labirent), Piksel Koşu (platform), Kar Fırtınası, Neon Koridor (12 bölümlük özgün FPS), Neon Yılan, Uzay Savunması, Blok Yağmuru, Tuğla Avcısı, Raket Düellosu, Gök Sıçrayışı, Asfalt Kaçışı, Meteor Kaçışı, Balon Patlat ve **Mayın Tarlası**.

Mayın Tarlası: kareye dokunarak aç, ekrandaki **BAYRAK MODU** düğmesine dokunup kareleri işaretle. İlk açılış güvenlidir. Klavyede oklarla kare seç, `Boşluk` ile aç. Yılan: yön düğmeleriyle dön, `A` ile hızlan.

## En kolay bağımsız yayın: GitHub Pages (13 yaş ve üzeri)

**Önemli yaş notu:** GitHub'ın genel koşulları kullanıcıların en az **13 yaşında** olmasını gerektiriyor (yerel hukuk ve özel ek kurallar ayrıca geçerlidir). Render'ın 10 Temmuz 2026 tarihli şartlarıysa **16 yaş altındakilerin kullanmasını yasaklıyor**. Bu nedenle şu an sana önerdiğimiz yöntem GitHub Pages; Render bölümü yalnızca ileride uygun yaş ve koşulları sağladığında başvurman için aşağıda duruyor. Yaşını yanlış belirtme.

GitHub Pages ile 14 oyun ve anahtarsız yerel atölye ücretsiz yayınlanabilir. ChatGPT Plus aboneliğine bağlı kalmaz. GitHub Pages statik site sunar; opsiyonel dış yapay zekâ API sunucusunu çalıştırmaz.

### Hazırlık: dosyaları GitHub'a koy

1. Bu ZIP'i bilgisayarında bir klasöre çıkar.
2. [github.com/new](https://github.com/new) adresinden örneğin `tahta-arcade` adlı **public** repo oluştur. GitHub Free üzerinde Pages için public repo gerekiyor.
3. Repo sayfasında **Add file → Upload files** ile tüm kaynak dosyalarını, özellikle `dist` ve `.github/workflows/pages.yml` klasörlerini yükle. Klasör yapısını koru; GitHub web arayüzü gizli `.github` klasörünü yükleyemiyorsa GitHub Desktop kullanabilirsin.
4. **Commit changes** ile kaydet. `.env`, şifre veya API anahtarı yükleme.

### GitHub Pages'i 3 adımda aç

1. Repo sayfasında **Settings → Pages**'e git.
2. **Build and deployment → Source** olarak **GitHub Actions** seç. ZIP'teki `.github/workflows/pages.yml` dosyası tüm ayarları yapar.
3. **Actions** sekmesindeki `Deploy Tahta Arcade to GitHub Pages` çalışması tamamlanınca oyun adresin `https://KULLANICI_ADIN.github.io/tahta-arcade/` biçiminde olur. Gerekirse ilk çalıştırmayı `Actions → workflow → Run workflow` ile başlat.

### Render seçeneği (16 yaşını doldurduğunda ve tüm koşulları sağladığında)

Render'ın **Static Site** planında bütün oyunlar çalışabilir. İlerde Render hesabı kullanma hakkın olduğunda şu adımları izle:

1. [dashboard.render.com](https://dashboard.render.com) adresine giriş yap, GitHub hesabını bağla.
2. **New → Static Site** seçip `tahta-arcade` reposunu seç.
3. **Root Directory** alanını boş bırak.
4. **Build Command** alanı boş kalabiliyorsa boş bırak; zorunluysa `echo ready` yaz.
5. **Publish Directory** alanına tam olarak `dist` yaz.
6. Ücretsiz planı seç ve **Deploy Static Site** düğmesine bas.
7. Render'ın verdiği `https://....onrender.com` adresini okulun akıllı tahtasında aç. Giriş gerekmez.

**Bilmen gereken:** Statik sürümlerde 14 oyun ve yerel oyun üreticisi çalışır. Yapay zekâ seçeneği işaretlenirse API olmadığı için açıkça yerel üreticiye geri döner. API anahtarı gerektirmez.

### Render sunuculu sürümü (yaş ve model sağlayıcısı koşullarını sağladığında)

1. Render'da **New → Web Service** seç (alternatif: depodaki `render.yaml` ile Blueprint oluştur).
2. GitHub reponu seç. **Language/Runtime: Node**, **Plan: Free**, **Build Command:** `npm install --omit=dev`, **Start Command:** `npm start`.
3. Şimdilik ortam değişkeni eklemezsen, site ve yerel oyun üreticisi tam çalışır.
4. Kullanabileceğin, yaş ve hizmet şartları bakımından sana uygun OpenAI-uyumlu bir model API'si edinirsen **Environment** bölümünde bu *üç gizli değişkeni* ekle:

   | Değişken | Açıklama |
   |---|---|
   | `AI_API_URL` | Sağlayıcının tam HTTPS `chat/completions` uç noktası |
   | `AI_MODEL` | Sağlayıcının model kimliği |
   | `AI_API_KEY` | Sağlayıcının gizli anahtarı — **yalnızca Render Environment'a** |

5. Değişkenleri kaydedince dağıtım yeniden başlayacaktır. Site içinde **Oyun Oluştur → Yapay zekâyı kullan** seçeneği aktifleştirilebilir. `/api/status` adresi sunucunun AI ayarlarını algılayıp algılamadığını gösterir.

**Önemli sınırlar:** GroqCloud'un kullanım şartlarında 18 yaş altındakiler için hizmete erişim kısıtı var; bu nedenle bu projede Groq anahtarı veya çağrısı hazır bağlanmadı. Ücretsiz model ve API kotaları değişebilir. Render 16 yaş altına kapalıdır. Yaş koşulunu veya okul kurallarını atlatmaya çalışma. Render'ın ücretsiz Web Service'i boşta kaldığında uyur ve ilk açılış gecikebilir. Statik yöntem bu sorundan etkilenmez.

## Yapay zekâ nasıl oyun oluşturuyor?

Kullanıcı oyun fikrini yazıyor → (seçilirse) model bir oyun planı JSON'u öneriyor → sunucu **tip, tema, zorluk, başlık ve süreyi** kontrol ediyor → sistem seçilen hazır oyun motorunu başlatıyor. **Modelden gelen çalıştırılabilir JavaScript/HTML sayfaya yüklenmiyor.** Bu yöntem hızlı ve güvenilir ama sıfırdan her tür oyunu yapabilen sınırsız kod üretici değildir; mevcut 10 oyun şablonunu birleştirir veya ayarlar. Sunucu ve anahtar yoksa metinden oyun türü algılayan yerel üretici çalışır.

Hiçbir model için “her fikir ilk denemede hatasız çalışır” garantisi verilemez. Yeni şablonlar eklenerek özelleştirme gücü artırılabilir.

## Yerelde çalıştır / test et

Node.js 20 veya üzeri kuruluysa:

```bash
npm test
npm start
```

Sonra tarayıcıda `http://localhost:10000` aç. `PORT=3000 npm start` ile port değişebilir. Dış paket bağımlılığı yoktur.

## Önemli dosyalar

- `dist/index.html`: oyun galerisi ve kontroller.
- `dist/styles.css`: dokunmatik ve farklı ekran boyutları için tasarım.
- `dist/game.js`: çekirdek oyunlar ve arayüz.
- `dist/extra-games.js`: diğer mini oyunlar, Yılan ve Mayın Tarlası.
- `server.mjs`: isteğe bağlı AI proxy'si ve statik dosya sunucusu.
- `tests/`: otomatik kontroller.
- `render.yaml`: Render Web Service için Blueprint.
- `.github/workflows/pages.yml`: GitHub Pages için hazır, bağımlılıksız statik yayın işlemi.

## İçerik notu

Bu arşiv, Doom/Mario/Pac-Man/Snow Bros'un telifli oyun dosyalarını içermez. Retro türlerinden esinlenen **özgün** mini oyunlar vardır. Freedoom da yaş doğrulaması gerektiren oynatıcılar ve okul kullanım koşulları nedeniyle eklenmemiştir.
