import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./WeddingStory.css";
import "./scene-layout.css";
import "./photo-motion.css";
import "./ambient-effects.css";
import "./chinese-fusion.css";
import "./extended-scenes.css";

const photos = [
  { src: "https://picsum.photos/seed/wedding-chapel/1280/1600", label: "CHAPEL LIGHT" },
  { src: "https://picsum.photos/seed/wedding-garden/1280/1600", label: "GARDEN VOWS" },
  { src: "https://picsum.photos/seed/wedding-banquet/1280/1600", label: "BANQUET HOUR" },
  { src: "https://picsum.photos/seed/wedding-dance/1280/1600", label: "FIRST DANCE" },
];

const timeline = ["初见", "靠近", "决定", "并肩"];
const memories = ["风吹过的下午", "并肩走过的街", "被认真收藏的笑", "从今天走向以后"];
const seasons = ["春日", "夏夜", "秋风", "冬雪"];
const blessings = ["囍", "百年好合", "永结同心", "良辰吉日"];
const ceremonyMoments = [
  "chapel doors",
  "vows",
  "rings",
  "bouquet",
  "first dance",
  "reception",
];
const guestNames = ["ANNA", "MING", "LUCAS", "YUE", "CHEN", "EMMA", "JAMES", "LIN"];
const closingPhotos = [
  "https://picsum.photos/seed/wedding-afterglow/1280/1600",
  "https://picsum.photos/seed/wedding-cake/1280/1600",
  "https://picsum.photos/seed/wedding-travel/1280/1600",
  "https://picsum.photos/seed/wedding-portrait/1280/1600",
  "https://picsum.photos/seed/wedding-table/1280/1600",
  "https://picsum.photos/seed/wedding-night/1280/1600",
];

export default function WeddingStory({ step }: ChapterStepProps) {
  return (
    <section className={`wa wa-step-${step}`}>
      <Petals />
      <FilmGrain />
      <ChineseFusionMarks />

      <IntroScene step={step} />
      <CoverScene step={step} />
      <NamesScene step={step} />
      <WallScene step={step} />
      <FeatureScene step={step} />
      <VowScene step={step} />
      <DetailsScene step={step} />
      <TimelineScene step={step} />
      <SeasonsScene step={step} />
      <InvitationScene step={step} />
      <ThanksScene step={step} />
      <ChapelScene step={step} />
      <RingsScene step={step} />
      <BouquetScene step={step} />
      <AisleScene step={step} />
      <DanceScene step={step} />
      <ReceptionScene step={step} />
      <ChampagneScene step={step} />
      <RsvpScene step={step} />
      <TeaCeremonyScene step={step} />
      <RedVeilScene step={step} />
      <FamilyTableScene step={step} />
      <GuestWallScene step={step} />
      <CakeCutScene step={step} />
      <AfterPartyScene step={step} />
      <ThankYouCardsScene step={step} />
      <TravelMemoryScene step={step} />
      <ClosingGalleryScene step={step} />
      <EndTitleScene step={step} />
      <FinaleScene step={step} />
    </section>
  );
}

function IntroScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-intro wa-scene" aria-hidden={step !== 0}>
      <span className="wa-intro-mark">Wedding day</span>
      <h1>
        <span className="wa-art-cn">囍</span>
        我们把今天，写成一首慢慢播放的诗。
      </h1>
      <p>our story begins</p>
    </div>
  );
}

function CoverScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-cover wa-scene" aria-hidden={step !== 1}>
      <div className="wa-cover-copy">
        <p className="kicker">Wedding album</p>
        <h1>
          <span className="wa-cover-xi">囍</span>
          执手成诗
        </h1>
        <p className="wa-cover-line">A quiet moving album for two hearts.</p>
        <span className="wa-date">2026 · Spring</span>
      </div>
      <figure className="wa-cover-photo">
        <img src={photos[0].src} alt="" />
      </figure>
    </div>
  );
}

function NamesScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-names wa-scene" aria-hidden={step !== 2}>
      <div className="wa-name-card">
        <span>Bride</span>
        <strong>新娘</strong>
      </div>
      <div className="wa-amp">&</div>
      <div className="wa-name-card">
        <span>Groom</span>
        <strong>新郎</strong>
      </div>
      <p>愿今日的誓言，在每一个明天继续生长。</p>
    </div>
  );
}

function WallScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-wall wa-scene" aria-hidden={step !== 3}>
      {photos.map((photo, index) => (
        <figure
          className="wa-wall-card"
          style={{ "--i": index } as CSSProperties}
          key={photo.src}
        >
          <img src={photo.src} alt="" />
          <figcaption>{photo.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function FeatureScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-feature wa-scene" aria-hidden={step !== 4}>
      <figure className="wa-feature-photo">
        <img src={photos[1].src} alt="" />
      </figure>
      <div className="wa-feature-copy">
        <span className="wa-section-num hero-num">01</span>
        <p>把时间放慢一点</p>
        <h2>让每一次靠近，都有被记住的光。</h2>
      </div>
    </div>
  );
}

function VowScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-vow wa-scene" aria-hidden={step !== 5}>
      <p className="kicker">A short vow</p>
      <h2>不是因为日子永远晴朗，而是想和你一起经过所有天气。</h2>
      <div className="wa-vow-rule" />
    </div>
  );
}

function DetailsScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-details wa-scene" aria-hidden={step !== 6}>
      {memories.map((memory, index) => (
        <figure
          className="wa-detail"
          key={memory}
          style={{ "--i": index } as CSSProperties}
        >
          <img src={photos[index % photos.length]!.src} alt="" />
          <figcaption>{memory}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function TimelineScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-timeline wa-scene" aria-hidden={step !== 7}>
      <div className="wa-film-strip">
        {photos.map((photo, index) => (
          <figure
            className="wa-film-frame"
            style={{ "--i": index } as CSSProperties}
            key={photo.label}
          >
            <img src={photo.src} alt="" />
          </figure>
        ))}
      </div>
      <div className="wa-line">
        {timeline.map((item, index) => (
          <span
            className="wa-line-point"
            style={{ "--i": index } as CSSProperties}
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function SeasonsScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-seasons wa-scene" aria-hidden={step !== 8}>
      <div className="wa-seasons-copy">
        <p className="kicker">Four seasons</p>
        <h2>四季轮换，爱有自己的光线。</h2>
      </div>
      <div className="wa-season-grid">
        {seasons.map((season, index) => (
          <div
            className="wa-season"
            key={season}
            style={{ "--i": index } as CSSProperties}
          >
            <span>{season}</span>
            <img src={photos[index % photos.length]!.src} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}

function InvitationScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-invitation wa-scene" aria-hidden={step !== 9}>
      <div className="wa-invite-photo">
        <img src={photos[2].src} alt="" />
      </div>
      <div className="wa-invite-copy">
        <p className="kicker">Wedding day</p>
        <h2>诚邀你见证，我们把余生交给彼此。</h2>
        <p>2026 · 05 · 20 / Rose garden chapel</p>
      </div>
    </div>
  );
}

function ThanksScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-thanks wa-scene" aria-hidden={step !== 10}>
      <p className="kicker">To our family and friends</p>
      <h2>谢谢你们，把祝福放进这一天。</h2>
      <div className="wa-thanks-list">
        <span>父母</span>
        <span>朋友</span>
        <span>远道而来的你</span>
      </div>
    </div>
  );
}

function FinaleScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-finale wa-scene" aria-hidden={step !== 29}>
      <div className="wa-final-card">
        <p className="kicker">Save the date</p>
        <h2>Every page after this, we write together.</h2>
        <div className="rule" />
        <p className="wa-final-meta">Our wedding day · 2026</p>
      </div>
    </div>
  );
}

function TeaCeremonyScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-tea wa-scene" aria-hidden={step !== 19}>
      <div className="wa-tea-cup wa-tea-left" />
      <div className="wa-tea-cup wa-tea-right" />
      <div className="wa-extended-copy">
        <p className="kicker">Tea ceremony</p>
        <h2>敬一盏茶，把感谢郑重说给家人听。</h2>
      </div>
    </div>
  );
}

function RedVeilScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-red-veil wa-scene" aria-hidden={step !== 20}>
      <div className="wa-veil-panel" />
      <div className="wa-extended-copy">
        <p className="kicker">Red veil</p>
        <h2>一抹朱红，让仪式有了东方的温度。</h2>
      </div>
    </div>
  );
}

function FamilyTableScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-family-table wa-scene" aria-hidden={step !== 21}>
      <figure className="wa-wide-photo">
        <img src="https://picsum.photos/seed/wedding-family-table/1800/1000" alt="" />
      </figure>
      <div className="wa-extended-copy">
        <p className="kicker">Family table</p>
        <h2>长桌、烛光、还有被认真安放的团圆。</h2>
      </div>
    </div>
  );
}

function GuestWallScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-guest-wall wa-scene" aria-hidden={step !== 22}>
      {guestNames.map((name, index) => (
        <span
          className="wa-guest-name"
          key={name}
          style={{ "--i": index } as CSSProperties}
        >
          {name}
        </span>
      ))}
      <div className="wa-extended-copy">
        <p className="kicker">Guest wall</p>
        <h2>每一个名字，都是这一天的光。</h2>
      </div>
    </div>
  );
}

function CakeCutScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-cake wa-scene" aria-hidden={step !== 23}>
      <div className="wa-cake-tier wa-tier-1" />
      <div className="wa-cake-tier wa-tier-2" />
      <div className="wa-cake-tier wa-tier-3" />
      <h2>Cut the cake. Keep the sweetness.</h2>
    </div>
  );
}

function AfterPartyScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-after-party wa-scene" aria-hidden={step !== 24}>
      {Array.from({ length: 9 }, (_, index) => (
        <span
          className="wa-party-light"
          key={index}
          style={{ "--i": index } as CSSProperties}
        />
      ))}
      <h2>After party, before forever.</h2>
    </div>
  );
}

function ThankYouCardsScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-thank-cards wa-scene" aria-hidden={step !== 25}>
      {["Thank you", "谢谢", "With love"].map((text, index) => (
        <article
          className="wa-thank-card"
          key={text}
          style={{ "--i": index } as CSSProperties}
        >
          <span>{text}</span>
          <p>for being here</p>
        </article>
      ))}
    </div>
  );
}

function TravelMemoryScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-travel wa-scene" aria-hidden={step !== 26}>
      <figure className="wa-passport-photo">
        <img src="https://picsum.photos/seed/wedding-honeymoon/1280/1600" alt="" />
      </figure>
      <div className="wa-passport-stamp">HONEYMOON</div>
      <div className="wa-extended-copy">
        <p className="kicker">Next chapter</p>
        <h2>从婚礼之后，去看更远的风景。</h2>
      </div>
    </div>
  );
}

function ClosingGalleryScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-closing-gallery wa-scene" aria-hidden={step !== 27}>
      {closingPhotos.map((src, index) => (
        <figure
          className="wa-closing-photo"
          key={src}
          style={{ "--i": index } as CSSProperties}
        >
          <img src={src} alt="" />
        </figure>
      ))}
    </div>
  );
}

function EndTitleScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-end-title wa-scene" aria-hidden={step !== 28}>
      <span className="wa-end-xi">囍</span>
      <h2>The Wedding Album</h2>
      <p>喜结良缘 · 百年好合</p>
    </div>
  );
}

function ChapelScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-chapel wa-scene" aria-hidden={step !== 11}>
      <div className="wa-chapel-door wa-door-left" />
      <div className="wa-chapel-door wa-door-right" />
      <div className="wa-chapel-copy">
        <p className="kicker">The chapel doors</p>
        <h2>The moment before forever.</h2>
      </div>
    </div>
  );
}

function RingsScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-rings wa-scene" aria-hidden={step !== 12}>
      <div className="wa-ring wa-ring-left" />
      <div className="wa-ring wa-ring-right" />
      <div className="wa-rings-copy">
        <p className="kicker">Exchange of rings</p>
        <h2>Two circles. One promise.</h2>
      </div>
    </div>
  );
}

function BouquetScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-bouquet wa-scene" aria-hidden={step !== 13}>
      {photos.map((photo, index) => (
        <figure
          className="wa-bouquet-photo"
          key={photo.label}
          style={{ "--i": index } as CSSProperties}
        >
          <img src={photo.src} alt="" />
        </figure>
      ))}
      <div className="wa-bouquet-copy">
        <p className="kicker">Bouquet hour</p>
        <h2>Ivory, garden roses, and a little golden light.</h2>
      </div>
    </div>
  );
}

function AisleScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-aisle wa-scene" aria-hidden={step !== 14}>
      <div className="wa-aisle-runner" />
      <div className="wa-aisle-copy">
        <p className="kicker">Down the aisle</p>
        <h2>All eyes forward. All hearts quiet.</h2>
      </div>
      <figure className="wa-aisle-photo">
        <img src={photos[3].src} alt="" />
      </figure>
    </div>
  );
}

function DanceScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-dance wa-scene" aria-hidden={step !== 15}>
      <figure className="wa-dance-photo">
        <img src={photos[0].src} alt="" />
      </figure>
      <div className="wa-dance-copy">
        <p className="kicker">First dance</p>
        <h2>Let the room disappear.</h2>
      </div>
    </div>
  );
}

function ReceptionScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-reception wa-scene" aria-hidden={step !== 16}>
      {ceremonyMoments.map((item, index) => (
        <span
          className="wa-reception-item"
          key={item}
          style={{ "--i": index } as CSSProperties}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ChampagneScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-champagne wa-scene" aria-hidden={step !== 17}>
      <div className="wa-glass wa-glass-left" />
      <div className="wa-glass wa-glass-right" />
      <h2>To love, laughter, and the long way home.</h2>
    </div>
  );
}

function RsvpScene({ step }: ChapterStepProps) {
  return (
    <div className="wa-rsvp wa-scene" aria-hidden={step !== 18}>
      <div className="wa-rsvp-card">
        <p className="kicker">RSVP</p>
        <h2>
          Celebrate this day with us.
          <span className="wa-rsvp-cn">良辰吉日</span>
        </h2>
        <span>Saturday evening · Rose garden chapel</span>
      </div>
    </div>
  );
}

function Petals() {
  return (
    <div className="wa-petals" aria-hidden="true">
      {Array.from({ length: 14 }, (_, index) => (
        <img
          key={index}
          src={index % 2 === 0 ? "/petal-1.png" : "/petal-2.png"}
          alt=""
          style={
            {
              "--i": index,
              "--petal-size": `${30 + (index % 5) * 8}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function FilmGrain() {
  return <div className="wa-grain" aria-hidden="true" />;
}

function ChineseFusionMarks() {
  return (
    <div className="wa-chinese-marks" aria-hidden="true">
      <span className="wa-xi-main">囍</span>
      {blessings.map((item, index) => (
        <span
          className="wa-blessing"
          key={item}
          style={{ "--i": index } as CSSProperties}
        >
          {item}
        </span>
      ))}
      <span className="wa-red-seal">合</span>
    </div>
  );
}
