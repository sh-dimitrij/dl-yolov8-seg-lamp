import React, { useState } from 'react';
import './ClipResultsSection.css';

const CATEGORY_LABEL = {
  lamp:       'Настольная лампа',
  luminaire:  'Светильник',
  chandelier: 'Люстра',
};

const CATEGORY_COLOR = {
  lamp:       '#583EE0',
  luminaire:  '#C5A23F',
  chandelier: '#34D1B7',
};

const ClipCard = ({ item, rank, ranked }) => {
  const hasScore = item.score !== null;
  const pct = hasScore ? (item.score * 100).toFixed(1) : null;
  const [imgError, setImgError] = useState(false);
  
  // Используем изображение с обработкой ошибки
  const imageSrc = imgError 
    ? `https://placehold.co/200x200/${CATEGORY_COLOR[item.category]?.replace('#', '') || '888888'}/white?text=${encodeURIComponent(item.name.slice(0, 10))}`
    : item.imagePath;

  return (
    <div className={`clip-card${ranked ? ' clip-card--ranked' : ''}`} title={item.description}>
      {ranked && <div className="clip-card-rank">#{rank}</div>}
      <div className="clip-card-img-wrap">
        <img 
          src={imageSrc} 
          alt={item.name} 
          onError={() => setImgError(true)}
        />
      </div>
      <div className="clip-card-body">
        <div className="clip-card-name">{item.name}</div>
        {hasScore && (
          <div className="clip-card-score">
            <div className="clip-score-bar-bg">
              <div className="clip-score-bar-fill" style={{ width: `${Math.min(Number(pct), 100)}%` }} />
            </div>
            <span className="clip-score-label">{pct}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ClipCategoryGroup = ({ categoryKey, items }) => {
  const color = CATEGORY_COLOR[categoryKey] || '#888';
  const label = CATEGORY_LABEL[categoryKey] || categoryKey;
  const ranked = items.length > 0 && items[0].score !== null;

  return (
    <div className="clip-category-group">
      <div className="clip-category-header" style={{ borderLeft: `4px solid ${color}` }}>
        <span className="clip-category-dot" style={{ background: color }} />
        <span className="clip-category-title">{label}</span>
        <span className="clip-category-sub">
          {ranked ? '— отсортировано по сходству' : '— все варианты'}
        </span>
      </div>
      {/* Один горизонтальный ряд со скроллом */}
      <div className="clip-cards-row">
        {items.map((item, i) => (
          <ClipCard key={item.id} item={item} rank={i + 1} ranked={ranked} />
        ))}
      </div>
    </div>
  );
};

const ClipResultsSection = ({ clipReady, clipLoading, clipProgress, clipError, clipItems }) => {
  return (
    <div className="clip-section">
      <div className="section-label clip-section-label">
        CLIP | Похожие карточки
      </div>

      {clipLoading && (
        <div className="clip-status">
          <div className="clip-spinner" />
          <span>
            {!clipReady
              ? `Загрузка SigLIP-модели… ${clipProgress > 0 ? clipProgress + '%' : ''}`
              : 'Анализ сегментов…'}
          </span>
        </div>
      )}

      {clipError && (
        <div className="clip-error">⚠ Ошибка CLIP: {clipError}</div>
      )}

      <div className="clip-results">
        {Object.entries(clipItems).map(([key, items]) => (
          <ClipCategoryGroup key={key} categoryKey={key} items={items} />
        ))}
      </div>
    </div>
  );
};

export default ClipResultsSection;