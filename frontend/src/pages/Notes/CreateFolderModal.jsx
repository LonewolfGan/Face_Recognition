import React, { useState, useRef, useEffect } from 'react';
import { LuX, LuSearch, LuFolder } from 'react-icons/lu';
import * as LuIcons from 'react-icons/lu';
import './CreateFolderModal.css';

/* ── Icon catalogue ─────────────────────────────────────────────────────── */
const ICON_CATEGORIES = [
  {
    label: 'Writing',
    icons: [
      'LuFileText', 'LuFile', 'LuFiles', 'LuFilePlus', 'LuBook',
      'LuBookOpen', 'LuBookMarked', 'LuNotebook', 'LuPen', 'LuPenLine',
      'LuClipboard', 'LuClipboardList', 'LuClipboardCheck',
    ],
  },
  {
    label: 'Work',
    icons: [
      'LuBriefcase', 'LuBuilding2', 'LuCalendar', 'LuCalendarDays',
      'LuCheckSquare', 'LuListTodo', 'LuKanban', 'LuTarget',
      'LuLayoutDashboard', 'LuPresentationChart', 'LuClipboardSignature',
      'LuMilestone', 'LuTimerReset',
    ],
  },
  {
    label: 'Technology',
    icons: [
      'LuCode', 'LuCode2', 'LuTerminal', 'LuGlobe', 'LuServer',
      'LuDatabase', 'LuCpu', 'LuWifi', 'LuBraces', 'LuBinary',
      'LuMonitor', 'LuSmartphone', 'LuHardDrive',
    ],
  },
  {
    label: 'Media',
    icons: [
      'LuCamera', 'LuImage', 'LuImages', 'LuMusic', 'LuMusic2',
      'LuVideo', 'LuFilm', 'LuHeadphones', 'LuMic', 'LuRadio',
      'LuTv', 'LuYoutube', 'LuPodcast',
    ],
  },
  {
    label: 'Learning',
    icons: [
      'LuGraduationCap', 'LuFlaskConical', 'LuMicroscope',
      'LuAtom', 'LuCompass', 'LuRuler', 'LuDraftingCompass',
      'LuLightbulb', 'LuBrainCircuit', 'LuPuzzle', 'LuAward',
    ],
  },
  {
    label: 'Personal',
    icons: [
      'LuHome', 'LuHeart', 'LuStar', 'LuUsers', 'LuUser',
      'LuBaby', 'LuMapPin', 'LuShopping', 'LuShoppingCart',
      'LuShoppingBag', 'LuGift', 'LuCake', 'LuDog',
    ],
  },
  {
    label: 'Finance',
    icons: [
      'LuWallet', 'LuTrendingUp', 'LuTrendingDown', 'LuBarChart2',
      'LuBarChart', 'LuDollarSign', 'LuCreditCard', 'LuReceipt',
      'LuPiggyBank', 'LuBanknote', 'LuPercent', 'LuCoins',
    ],
  },
  {
    label: 'Travel',
    icons: [
      'LuPlane', 'LuCar', 'LuMap', 'LuNavigation', 'LuMountain',
      'LuSunrise', 'LuUmbrella', 'LuAnchor', 'LuTrain',
      'LuBike', 'LuBus', 'LuShip',
    ],
  },
  {
    label: 'Health',
    icons: [
      'LuHeart', 'LuActivity', 'LuDumbbell', 'LuApple',
      'LuLeaf', 'LuSalad', 'LuPill', 'LuStethoscope',
      'LuThermometer', 'LuSyringe', 'LuHeartPulse', 'LuBed',
    ],
  },
  {
    label: 'Misc',
    icons: [
      'LuTag', 'LuLayers', 'LuPackage', 'LuLock', 'LuShield',
      'LuBell', 'LuFlag', 'LuZap', 'LuCrown', 'LuGem',
      'LuFire', 'LuStar', 'LuSparkles', 'LuRocket',
      'LuTrophy', 'LuThumbsUp', 'LuSmile', 'LuSun',
    ],
  },
];

const ALL_ICONS = ICON_CATEGORIES.flatMap(c => c.icons);

function DynIcon({ name, size = 18 }) {
  const Comp = LuIcons[name];
  if (!Comp) return <LuFolder size={size} />;
  return <Comp size={size} />;
}

const DEFAULT_ICON = 'LuFolder';

export default function CreateFolderModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_ICON);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Filter icons
  const filteredCategories = query.trim()
    ? [{ label: 'Results', icons: ALL_ICONS.filter(n => n.toLowerCase().replace('lu', '').includes(query.toLowerCase())) }]
    : ICON_CATEGORIES;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await onCreate(name.trim(), selectedIcon);
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="cfm-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cfm-modal" role="dialog" aria-modal="true" aria-label="Create folder">
        {/* Header */}
        <div className="cfm-header">
          <span className="cfm-title">New folder</span>
          <button className="cfm-close" onClick={onClose} aria-label="Close"><LuX size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Preview + name */}
          <div className="cfm-name-row">
            <div className="cfm-icon-preview">
              <DynIcon name={selectedIcon} size={20} />
            </div>
            <input
              ref={nameRef}
              className="cfm-name-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Folder name"
              maxLength={100}
              required
            />
          </div>

          {/* Icon search */}
          <div className="cfm-search-row">
            <LuSearch size={14} className="cfm-search-icon" />
            <input
              className="cfm-search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search icons…"
            />
          </div>

          {/* Icon grid */}
          <div className="cfm-icon-scroll">
            {filteredCategories.map(cat => (
              cat.icons.length > 0 && (
                <div key={cat.label} className="cfm-category">
                  <span className="cfm-category-label">{cat.label}</span>
                  <div className="cfm-icon-grid">
                    {cat.icons.map(iconName => (
                      <button
                        key={iconName}
                        type="button"
                        className={`cfm-icon-btn ${selectedIcon === iconName ? 'cfm-icon-btn--active' : ''}`}
                        onClick={() => setSelectedIcon(iconName)}
                        title={iconName.replace('Lu', '')}
                        aria-label={iconName.replace('Lu', '')}
                      >
                        <DynIcon name={iconName} size={17} />
                      </button>
                    ))}
                  </div>
                </div>
              )
            ))}
            {filteredCategories[0]?.icons.length === 0 && (
              <p className="cfm-no-results">No icons found</p>
            )}
          </div>

          {/* Actions */}
          <div className="cfm-actions">
            <button type="button" className="cfm-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="cfm-btn-create" disabled={!name.trim() || submitting}>
              {submitting ? 'Creating…' : 'Create folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
