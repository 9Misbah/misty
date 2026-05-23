/*
 * MISTY - Luxury Artisanal Mirrors
 * Main Application JavaScript Controller
 */

import { 
  initViewer, 
  updateShape, 
  updateFinish, 
  updateLED, 
  updateDimensions, 
  updateWall,
  calculatePrice 
} from './viewer3d.js';

// DOM Selectors
const docBody = document.body;
const navMenu = document.getElementById('nav-menu');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const configuratorModal = document.getElementById('configurator-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCustomizerTrigger = document.getElementById('btn-customizer-trigger');
const heroBtn3D = document.getElementById('hero-btn-3d');
const btnCtaLaunchCustomizer = document.getElementById('btn-cta-launch-customizer');
const bespokeQuoteForm = document.getElementById('bespoke-quote-form');
const toastNotification = document.getElementById('toast-notification');
const toastMessage = document.getElementById('toast-message');

// Configurator Panel Selectors
const controlShapes = document.getElementById('control-shapes');
const controlFinishes = document.getElementById('control-finishes');
const controlWalls = document.getElementById('control-walls');
const controlLedToggle = document.getElementById('input-led-toggle');
const ledSettingsContainer = document.getElementById('led-settings-container');
const controlLedColors = document.getElementById('control-led-colors');
const inputLedBrightness = document.getElementById('input-led-brightness');
const ledBrightnessVal = document.getElementById('led-brightness-val');
const inputMirrorWidth = document.getElementById('input-mirror-width');
const mirrorWidthVal = document.getElementById('mirror-width-val');
const inputMirrorHeight = document.getElementById('input-mirror-height');
const mirrorHeightVal = document.getElementById('mirror-height-val');
const heightSliderGroup = document.getElementById('height-slider-group');
const configuratorPriceLabel = document.getElementById('configurator-price');
const btnOrderConfigurator = document.getElementById('btn-order-configurator');

// Product Preset Data
const productPresets = {
  aurelia: {
    shape: 'round',
    finish: 'brass',
    width: 80,
    height: 80,
    led: false,
    ledTemp: 'warm',
    ledBrightness: 80,
    wall: 'plaster'
  },
  verona: {
    shape: 'arch',
    finish: 'wood',
    width: 90,
    height: 180,
    led: false,
    ledTemp: 'warm',
    ledBrightness: 80,
    wall: 'beige'
  },
  elysian: {
    shape: 'organic',
    finish: 'brass',
    width: 85,
    height: 110,
    led: true,
    ledTemp: 'amber',
    ledBrightness: 90,
    wall: 'concrete'
  },
  valerius: {
    shape: 'rectangle',
    finish: 'black',
    width: 90,
    height: 160,
    led: false,
    ledTemp: 'warm',
    ledBrightness: 80,
    wall: 'brick'
  }
};

let currentConfigState = {
  shape: 'round',
  finish: 'brass',
  width: 80,
  height: 80,
  ledEnabled: true,
  ledTemp: 'warm',
  ledBrightness: 0.8,
  wall: 'plaster'
};

let isViewerInitialized = false;

// ==========================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupCatalog3DTriggers();
  setupConfiguratorControls();
  setupQuoteForm();
});

// 1. Mobile Menu & Header Navigation
function setupNavigation() {
  // Mobile Hamburger Toggle
  menuToggleBtn.addEventListener('click', () => {
    headerToggleMenu();
  });

  // Smooth scroll links closing mobile menu
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (docBody.classList.contains('nav-active')) {
        headerToggleMenu();
      }
    });
  });

  // Customizer Trigger Links
  btnCustomizerTrigger.addEventListener('click', () => {
    openStudioModal();
  });
  
  heroBtn3D.addEventListener('click', () => {
    openStudioModal();
  });

  btnCtaLaunchCustomizer.addEventListener('click', () => {
    openStudioModal();
  });
}

function headerToggleMenu() {
  docBody.classList.toggle('nav-active');
}

// 2. Catalog Card 3D Buttons
function setupCatalog3DTriggers() {
  const cardsBtn3D = document.querySelectorAll('.product-btn-3d');
  cardsBtn3D.forEach(btn => {
    btn.addEventListener('click', () => {
      const productKey = btn.getAttribute('data-product');
      const preset = productPresets[productKey];
      
      if (preset) {
        // Sync our local state to preset
        currentConfigState = {
          shape: preset.shape,
          finish: preset.finish,
          width: preset.width,
          height: preset.height,
          ledEnabled: preset.led,
          ledTemp: preset.ledTemp,
          ledBrightness: preset.ledBrightness / 100,
          wall: preset.wall
        };
        
        openStudioModal(currentConfigState);
      }
    });
  });
}

// ==========================================
// STUDIO MODAL LIFECYCLE
// ==========================================
function openStudioModal(customState = null) {
  configuratorModal.classList.add('active');
  docBody.style.overflow = 'hidden'; // Lock background scroll

  // If no custom state provided, load default (Round Brass)
  const activeState = customState || currentConfigState;

  // Initialize Three.js scene only once
  if (!isViewerInitialized) {
    // Small timeout to let overlay transition complete and sizing calculate accurately
    setTimeout(() => {
      initViewer('threejs-canvas', 'canvas-container-3d');
      isViewerInitialized = true;
      syncStateToUI(activeState);
    }, 150);
  } else {
    // If already initialized, just update scene state and sync UI
    syncStateToUI(activeState);
  }
}

function closeStudioModal() {
  configuratorModal.classList.remove('active');
  docBody.style.overflow = ''; // Unlock background scroll
}

btnCloseModal.addEventListener('click', closeStudioModal);
// Close modal on escape key press
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && configuratorModal.classList.contains('active')) {
    closeStudioModal();
  }
});

// ==========================================
// DYNAMIC CONFIGURATOR CONTROLS
// ==========================================
function setupConfiguratorControls() {
  
  // 1. Shape Configuration Clicks
  const shapeBtns = controlShapes.querySelectorAll('.option-btn');
  shapeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      shapeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const selectedShape = btn.getAttribute('data-shape');
      currentConfigState.shape = selectedShape;

      // Handle round size lock visual behavior
      if (selectedShape === 'round') {
        heightSliderGroup.style.display = 'none'; // Hide height slider, as circles are symmetric
        currentConfigState.height = currentConfigState.width; // Force symmetry
      } else {
        heightSliderGroup.style.display = 'block';
      }

      const newPrice = updateShape(selectedShape);
      updateUIPrice(newPrice);
    });
  });

  // 2. Finish Finishes Clicks
  const finishSwatches = controlFinishes.querySelectorAll('.swatch-item');
  finishSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      finishSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');

      const selectedFinish = swatch.getAttribute('data-finish');
      currentConfigState.finish = selectedFinish;
      
      const newPrice = updateFinish(selectedFinish);
      updateUIPrice(newPrice);
    });
  });

  // 3. Wall Backdrop Configurator
  const wallBtns = controlWalls.querySelectorAll('.option-btn');
  wallBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      wallBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const selectedWall = btn.getAttribute('data-wall');
      currentConfigState.wall = selectedWall;
      
      updateWall(selectedWall);
    });
  });

  // 4. LED Backlighting Toggles
  controlLedToggle.addEventListener('change', () => {
    const isChecked = controlLedToggle.checked;
    currentConfigState.ledEnabled = isChecked;

    if (isChecked) {
      ledSettingsContainer.style.opacity = '1';
      ledSettingsContainer.style.pointerEvents = 'all';
    } else {
      ledSettingsContainer.style.opacity = '0.3';
      ledSettingsContainer.style.pointerEvents = 'none';
    }

    updateLED(isChecked, currentConfigState.ledTemp, currentConfigState.ledBrightness);
    updateUIPrice(calculatePrice());
  });

  // LED Colors Temperature Swatches
  const ledColors = controlLedColors.querySelectorAll('.swatch-item');
  ledColors.forEach(colorItem => {
    colorItem.addEventListener('click', () => {
      ledColors.forEach(c => c.classList.remove('active'));
      colorItem.classList.add('active');

      const selectedTemp = colorItem.getAttribute('data-temp');
      currentConfigState.ledTemp = selectedTemp;

      updateLED(true, selectedTemp, currentConfigState.ledBrightness);
    });
  });

  // LED Brightness Slider
  inputLedBrightness.addEventListener('input', () => {
    const rawVal = parseInt(inputLedBrightness.value);
    ledBrightnessVal.textContent = `${rawVal}%`;

    const brightnessCoeff = rawVal / 100;
    currentConfigState.ledBrightness = brightnessCoeff;

    updateLED(true, null, brightnessCoeff);
  });

  // 5. Physical Dimension Sliders
  inputMirrorWidth.addEventListener('input', () => {
    const w = parseInt(inputMirrorWidth.value);
    mirrorWidthVal.textContent = `${w}cm`;
    currentConfigState.width = w;

    if (currentConfigState.shape === 'round') {
      currentConfigState.height = w;
      inputMirrorHeight.value = w;
      mirrorHeightVal.textContent = `${w}cm`;
    }

    const newPrice = updateDimensions(currentConfigState.width, currentConfigState.height);
    updateUIPrice(newPrice);
  });

  inputMirrorHeight.addEventListener('input', () => {
    const h = parseInt(inputMirrorHeight.value);
    mirrorHeightVal.textContent = `${h}cm`;
    currentConfigState.height = h;

    const newPrice = updateDimensions(currentConfigState.width, currentConfigState.height);
    updateUIPrice(newPrice);
  });

  // 6. Direct Configurator Redirection ordering button
  btnOrderConfigurator.addEventListener('click', () => {
    // Populate bespoke form values
    document.getElementById('form-shape').value = currentConfigState.shape;
    document.getElementById('form-frame').value = currentConfigState.finish;
    document.getElementById('form-width').value = currentConfigState.width;
    document.getElementById('form-height').value = currentConfigState.height;
    
    const backlightSelect = document.getElementById('form-backlight');
    if (!currentConfigState.ledEnabled) {
      backlightSelect.value = 'none';
    } else {
      if (currentConfigState.ledTemp === 'candle' || currentConfigState.ledTemp === 'amber') {
        backlightSelect.value = 'led-dual';
      } else {
        backlightSelect.value = 'led';
      }
    }

    // Close 3D visuals overlay
    closeStudioModal();

    // Scroll to contact form
    const bespokeSection = document.getElementById('bespoke');
    bespokeSection.scrollIntoView({ behavior: 'smooth' });

    // Show a helpful notification
    showToast("Bespoke form pre-filled with your customized 3D mirror!");
  });
}

// Synchronizes the external JS state with DOM elements inside 3D modal
function syncStateToUI(state) {
  // 1. Shapes
  const shapesBtns = controlShapes.querySelectorAll('.option-btn');
  shapesBtns.forEach(btn => {
    if (btn.getAttribute('data-shape') === state.shape) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  if (state.shape === 'round') {
    heightSliderGroup.style.display = 'none';
  } else {
    heightSliderGroup.style.display = 'block';
  }

  // 2. Finishes
  const finishSwatches = controlFinishes.querySelectorAll('.swatch-item');
  finishSwatches.forEach(swatch => {
    if (swatch.getAttribute('data-finish') === state.finish) {
      swatch.classList.add('active');
    } else {
      swatch.classList.remove('active');
    }
  });

  // 3. Wall Backdrop
  const wallBtns = controlWalls.querySelectorAll('.option-btn');
  wallBtns.forEach(btn => {
    if (btn.getAttribute('data-wall') === state.wall) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 4. LED Toggle
  controlLedToggle.checked = state.ledEnabled;
  if (state.ledEnabled) {
    ledSettingsContainer.style.opacity = '1';
    ledSettingsContainer.style.pointerEvents = 'all';
  } else {
    ledSettingsContainer.style.opacity = '0.3';
    ledSettingsContainer.style.pointerEvents = 'none';
  }

  // LED Colors Temperature Swatches
  const ledColors = controlLedColors.querySelectorAll('.swatch-item');
  ledColors.forEach(item => {
    if (item.getAttribute('data-temp') === state.ledTemp) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // LED Brightness Slider
  const brightnessPercent = Math.round(state.ledBrightness * 100);
  inputLedBrightness.value = brightnessPercent;
  ledBrightnessVal.textContent = `${brightnessPercent}%`;

  // 5. Dimensions
  inputMirrorWidth.value = state.width;
  mirrorWidthVal.textContent = `${state.width}cm`;

  inputMirrorHeight.value = state.height;
  mirrorHeightVal.textContent = `${state.height}cm`;

  // Trigger updates directly in Three.js visualizer scene
  updateShape(state.shape);
  updateFinish(state.finish);
  updateLED(state.ledEnabled, state.ledTemp, state.ledBrightness);
  updateDimensions(state.width, state.height);
  updateWall(state.wall);

  // Sync pricing label
  const finalPrice = calculatePrice();
  updateUIPrice(finalPrice);
}

function updateUIPrice(price) {
  configuratorPriceLabel.textContent = `$${price}`;
}

// ==========================================
// BESPOKE FORM SUBMIT & TOAST SYSTEMS
// ==========================================
function setupQuoteForm() {
  bespokeQuoteForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const clientName = document.getElementById('form-name').value;
    
    // Simulate API request send
    const submitBtn = document.getElementById('btn-submit-form');
    submitBtn.textContent = "Submitting Inquiry...";
    submitBtn.disabled = true;

    setTimeout(() => {
      // Re-enable
      submitBtn.textContent = "Request Custom Quote";
      submitBtn.disabled = false;

      // Show toast
      showToast(`Thank you, ${clientName}! Our designers will contact you within 24 hours.`);
      
      // Reset
      bespokeQuoteForm.reset();
    }, 1200);
  });
}

// Toast notification trigger
function showToast(message) {
  toastMessage.textContent = message;
  toastNotification.classList.add('active');

  // Fade out after 4.5 seconds
  setTimeout(() => {
    toastNotification.classList.remove('active');
  }, 4500);
}
