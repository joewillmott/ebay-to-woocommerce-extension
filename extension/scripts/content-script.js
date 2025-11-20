(() => {
  const cleanText = (value) => (value || '').replace(/\s+/g, ' ').trim();

  const getItemId = () => {
    const selectors = [
      '#descItemNumber',
      '#viItemNumber',
      '[data-testid="x-item-id"]'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        return cleanText(el.textContent);
      }
    }

    const urlMatch = window.location.pathname.match(/\/itm\/([0-9]+)/);
    return urlMatch ? urlMatch[1] : '';
  };

  const getTitle = () => {
    const titleEl = document.querySelector('#itemTitle') || document.querySelector('[data-testid="x-item-title"]');
    if (!titleEl) return document.title.replace(' | eBay', '').trim();
    return cleanText(titleEl.textContent.replace('Details about\xa0', ''));
  };

  const getPriceInfo = () => {
    const priceEl = document.querySelector('#prcIsum') || document.querySelector('#mm-saleDscPrc') || document.querySelector('[itemprop="price"]') || document.querySelector('[data-testid="x-price-primary"] span');
    const currencyEl = priceEl?.getAttribute('content') ? null : document.querySelector('#prcIsum[content], [itemprop="priceCurrency"]');

    const priceText = priceEl ? cleanText(priceEl.getAttribute('content') || priceEl.textContent) : '';
    const numeric = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    const currency = priceEl?.dataset?.currencyId || currencyEl?.getAttribute('content') || (priceText.match(/[£$€]/)?.[0] ?? '');

    return {
      price: Number.isFinite(numeric) ? numeric : null,
      currency: currency
    };
  };

  const getQuantityInfo = () => {
    const qtyEl = document.querySelector('#qtySubTxt') || document.querySelector('[data-testid="availability-row"]');
    const qtyText = cleanText(qtyEl?.textContent || '');
    const quantityMatch = qtyText.match(/([0-9]+) available/i);
    const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : null;
    const inStock = !/out of stock/i.test(qtyText);

    return { quantity, inStock };
  };

  const getImages = () => {
    const imgs = new Set();
    const selectors = ['#vi_main_img_holder img', '#vi_main_img_fs img', '[data-testid="ux-image-carousel-item"] img'];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((img) => {
        const src = img?.getAttribute('src') || img?.getAttribute('data-src');
        if (src && !src.includes('1x1.gif')) {
          imgs.add(src.replace(/\$_[0-9]+\./, '$_10.'));
        }
      });
    });

    return Array.from(imgs);
  };

  const getDescription = () => {
    const desc = document.querySelector('#desc_div') || document.querySelector('#itemDescriptionContent') || document.querySelector('#viTabs_0_is');

    if (desc) {
      return desc.innerHTML.trim();
    }

    const iframe = document.querySelector('#desc_ifr');
    if (iframe && iframe.contentDocument) {
      return iframe.contentDocument.body.innerHTML.trim();
    }

    return '';
  };

  const payload = {
    itemId: getItemId(),
    title: getTitle(),
    descriptionHtml: getDescription(),
    images: getImages(),
    price: getPriceInfo(),
    stock: getQuantityInfo(),
    sourceUrl: window.location.href
  };

  return payload;
})();
