// ==UserScript==
// @name         Stash Cards: Scene + Gallery + Studio Logo Enhancer (Consolidated)
// @namespace    stash
// @version      3.0
// @description  Studio left logos, placeholder consistency, title clamp, line counts, aspect ratio logo classes, date tagging, and persistent placeholder colors.
// @match        http://localhost:9999/*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const LOGO_SIZE = 40;
    const LOGO_GAP = 22;
    const studioColorCache = new Map(); // stores color per studio

    function colorForStudio(name) {
        if (studioColorCache.has(name)) return studioColorCache.get(name);
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
        const hue = Math.abs(hash) % 360;
        const color = `hsl(${hue}, 68%, 55%)`;
		studioColorCache.set(name, color);
        return color;
    }

    function createPlaceholder(name) {
        const color = colorForStudio(name || "Unknown");

        const initials = (name || "S")
            .split(/\s+/)
            .map(w => w[0] || "")
            .join("")
            .toUpperCase()
            .slice(0, 2);

        const svg = `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}">
		<rect width="100%" height="100%" fill="${color}" rx="4" ry="4"/>					
		<text x="50%" y="50%"
        font-family="sans-serif"
        font-size="${Math.floor(LOGO_SIZE * 0.6)}"
        fill="white"
        text-anchor="middle"
        dominant-baseline="central">${initials}</text>
		</svg>`.trim();
			
			//replace <rect width="100%" height="100%" fill="transparent" rx="4" ry="4"/>						
			//with	
			//<rect width="100%" height="100%" fill="${color}" rx="4" ry="4"/> for color background

        return "data:image/svg+xml;base64," + btoa(svg);
    }



    const style = document.createElement("style");
    style.textContent = `
    .card-header-row { display: flex; align-items: flex-start; }
    .studio-thumb { width:${LOGO_SIZE}px; height:${LOGO_SIZE}px; flex:0 0 ${LOGO_SIZE}px; margin-right:${LOGO_GAP}px; display:flex; }
    .studio-thumb img { width:100%; height:100%; object-fit:contain; pointer-events:none; }
    
    .no-description .card-section-title .TruncatedText,
    .no-description .gallery-card .card-section-title .TruncatedText {
        -webkit-line-clamp:3 !important;
    }

    .placeholder-studio { opacity: 0.9; }
    `;
    document.head.appendChild(style);

	function normalizeStudioName(name) {
			return (name || "")
			.toLowerCase()
			.replace(/logo$/i, '')
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
		}

		const STUDIO_LOGO_OVERRIDES_KEY = 'stashStudioLogoOverrides';

		function loadLogoOverrides() {
			try {
				return JSON.parse(localStorage.getItem(STUDIO_LOGO_OVERRIDES_KEY)) || {};
			} catch {
				return {};
			}
		}

		function saveLogoOverrides(overrides) {
			localStorage.setItem(
				STUDIO_LOGO_OVERRIDES_KEY,
				JSON.stringify(overrides));
		}

		const studioLogoOverrides = loadLogoOverrides();

		function applyStudioOverride(img) {
			const studio = normalizeStudioName(
					img.getAttribute('alt') ||
					img.closest('a')?.getAttribute('title'));

			if (!studio)
				return;

			const override = studioLogoOverrides[studio];
			if (!override)
				return;

			if (override.remove) {
				img.classList.remove(...override.remove);
			}

			if (override.force) {
				img.classList.add(...override.force);
			}
		}

    function classifyLogo(img) {
    img.onload = () => {
        const w = img.naturalWidth || LOGO_SIZE;
        const h = img.naturalHeight || LOGO_SIZE;

        const ratio = w / h;
        const fill = Math.min(w, h) / Math.max(w, h); // 0 = very skinny, 1 = square

        img.classList.remove(
            'logo-wide', 'logo-tall', 'logo-square',
            'logo-skinny', 'logo-fat'
        );

        // Primary shape
        if (ratio > 1.1) img.classList.add('logo-wide');
        else if (ratio < 0.75) img.classList.add('logo-tall');
        else img.classList.add('logo-square');

        // Secondary thickness
        if (fill < 0.28) img.classList.add('logo-skinny');
        else if (fill > 0.4) img.classList.add('logo-fat');
    };

    // Handle cached images
    if (img.complete && img.naturalWidth) img.onload();
}


		studioLogoOverrides["giorgio grandi"] = {
			force: ["logo-wide", "logo-skinny"],
			remove: ["logo-fat"]
		};
		studioLogoOverrides["futanaria"] = {
			force: ["logo-wide", "logo-fat"],
			remove: ["logo-skinny"]
		};
		studioLogoOverrides["tushy"] = {
			force: ["logo-wide", "logo-fat"],
			remove: ["logo-skinny"]
		};
		studioLogoOverrides["red light district"] = {
			force: ["logo-wide", "logo-skinny"],
			remove: ["logo-fat"]
		};

    //studioLogoOverrides["brazzers exxtra"] = {
    //    force: ["logo-wide", "logo-skinny"],
    //    remove: ["logo-fat"]
    //};



    function tagActualLines(card, el) {
        requestAnimationFrame(() => {
            const lh = parseFloat(getComputedStyle(el).lineHeight) || 16;
            const w = el.getBoundingClientRect().width;
            el.style.width = `${w}px`;
            const h = el.getBoundingClientRect().height;
            el.style.width = '';
            const lines = Math.max(1, Math.round(h / lh));
            [...card.classList].forEach(c => c.startsWith('lines-actual-') && card.classList.remove(c));
            card.classList.add(`lines-actual-${lines}`);
        });
    }

    function enhanceSceneOrGallery(card, type) {
        if (card.dataset.processed) return;
        card.dataset.processed = "true";

        const section = card.querySelector('.card-section');
        if (!section) return;

        const overlay = card.querySelector('.studio-overlay');
        if (overlay) {
            let link = overlay.querySelector('a');
            let studioName = link?.getAttribute('title')?.trim()
                || link?.textContent?.trim()
                || overlay.querySelector('img')?.alt?.trim()
                || "Unknown";

            let img = overlay.querySelector('img')?.cloneNode(true);
            overlay.remove();

            if (!img) {
                img = document.createElement('img');
                img.src = createPlaceholder(studioName);
                img.classList.add('placeholder-studio');
            }
            classifyLogo(img);

            const header = document.createElement('div');
            header.className = 'card-header-row';

            const thumb = document.createElement('div');
            thumb.className = 'studio-thumb';

            const linkElem = document.createElement('a');
            linkElem.href = link?.href || '#';
            linkElem.appendChild(img);
            thumb.appendChild(linkElem);

            const titleDate = document.createElement('div');
            titleDate.className = 'title-date';

            const title = section.querySelector('.card-section-title');
            const date = section.querySelector(type === 'scene' ? '.scene-card__date' : '.gallery-card__date');

            titleDate.appendChild(title);
            if (date) titleDate.appendChild(date);

            header.appendChild(thumb);
            header.appendChild(titleDate);
            section.prepend(header);
        }

        const desc = section.querySelector('.scene-card__description, .gallery-card__description');
        if (!desc || !desc.textContent.trim()) card.classList.add('no-description');

        const date = section.querySelector(type === 'scene' ? '.scene-card__date' : '.gallery-card__date');
        card.classList.add(date && date.textContent.trim() ? 'has-date' : 'no-date');

        const titleEl = section.querySelector('.card-section-title .TruncatedText') || section.querySelector('.card-section-title');
        if (titleEl) {
            tagActualLines(card, titleEl);
            try { new ResizeObserver(() => tagActualLines(card, titleEl)).observe(titleEl); } catch (e) { }
        }
    }

    function replaceMissingStudioImages(scope = document) {
        scope.querySelectorAll('.studio-card-image').forEach(img => {
            const src = img.getAttribute('src') || "";
            if (!src.includes("default=true")) return;
            const card = img.closest('.studio-card');
            if (!card) return;
            const title = card.querySelector('.card-section-title .TruncatedText');
            const name = title ? title.textContent.trim() : "Unknown";
            const placeholder = createPlaceholder(name);
            img.src = img.srcset = placeholder;
            img.removeAttribute('srcset');
            img.removeAttribute('loading');
        });
    }

    function replaceStudioPageLogo() {
        const img = document.querySelector('#studio-page .detail-header-image img.logo');
        if (!img) return;

        const src = img.getAttribute('src') || "";
        if (!src.includes("default=true")) return;

        const nameEl = document.querySelector('.studio-name');
        const name = nameEl ? nameEl.textContent.trim() : "Unknown";

        img.src = createPlaceholder(name);
        img.removeAttribute('srcset');
        img.classList.add('placeholder-studio');
    }

	function replaceScenePageStudioLogo() {
		const img = document.querySelector('.scene-studio-image img.studio-logo');
		if (!img) return;

		const src = img.getAttribute('src') || "";
		if (!src.includes("default=true")) return;

		const name =
			img.getAttribute('alt')?.replace(/logo$/i, '').trim()
			|| document.querySelector('.scene-studio-image a')?.getAttribute('title')
			|| "Unknown";

		img.src = createPlaceholder(name);
		img.removeAttribute('srcset');
		img.classList.add('placeholder-studio');
		classifyLogo(img);
	}

	function replaceGalleryPageStudioLogo() {
		const img = document.querySelector('.gallery-studio-image img.studio-logo');
		if (!img) return;

		const src = img.getAttribute('src') || "";
		if (!src.includes("default=true")) return;

		const name =
			img.getAttribute('alt')?.replace(/logo$/i, '').trim()
			|| document.querySelector('.gallery-studio-image a')?.getAttribute('title')
			|| "Unknown";

		img.src = createPlaceholder(name);
		img.removeAttribute('srcset');
		img.classList.add('placeholder-studio');
		classifyLogo(img);
	}


    function processAdded(node) {
		if (node.nodeType !== 1) return;
		if (node.classList.contains('scene-card')) enhanceSceneOrGallery(node, 'scene');
		if (node.classList.contains('gallery-card')) enhanceSceneOrGallery(node, 'gallery');
		if (node.querySelectorAll) {
			node.querySelectorAll('.scene-card').forEach(n => enhanceSceneOrGallery(n, 'scene'));
			node.querySelectorAll('.gallery-card').forEach(n => enhanceSceneOrGallery(n, 'gallery'));
			replaceMissingStudioImages(node);
			replaceStudioPageLogo();
			replaceScenePageStudioLogo();
			replaceGalleryPageStudioLogo();
		}
	}


    document.querySelectorAll('.scene-card').forEach(n => enhanceSceneOrGallery(n, 'scene'));
    document.querySelectorAll('.gallery-card').forEach(n => enhanceSceneOrGallery(n, 'gallery'));
    replaceMissingStudioImages();

    replaceStudioPageLogo();
	replaceScenePageStudioLogo();
	replaceGalleryPageStudioLogo();

    new MutationObserver(mutations => {
        for (const m of mutations) {
            m.addedNodes.forEach(processAdded);
        }
    }).observe(document.body, { childList: true, subtree: true });
})();
