document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleButton');
  const penButton = document.getElementById('penButton');
  const eraserButton = document.getElementById('eraserButton');
  const shapeButton = document.getElementById('shapeButton');
  const shapeSection = document.getElementById('shapeSection');
  const circleButton = document.getElementById('circleButton');
  const rectangleButton = document.getElementById('rectangleButton');
  const arrowButton = document.getElementById('arrowButton');
  const highlighterButton = document.getElementById('highlighterButton');
  const clearButton = document.getElementById('clearButton');
  const colorPicker = document.getElementById('colorPicker');
  const saveButton = document.getElementById('saveButton');

  const sendMessageToContent = (message) => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error: ", chrome.runtime.lastError.message);
          }
        });
      }
    });
  };

  toggleButton.addEventListener('change', () => {
    const enabled = toggleButton.checked;
    sendMessageToContent({ action: enabled ? 'enable' : 'disable' });
  });

  penButton.addEventListener('click', () => {
    sendMessageToContent({ action: 'pen' });
  });

  eraserButton.addEventListener('click', () => {
    sendMessageToContent({ action: 'eraser' });
  });

  shapeButton.addEventListener('click', () => {
    shapeSection.classList.toggle('hidden');
  });

  circleButton.addEventListener('click', () => {
    sendMessageToContent({ action: 'shape', shape: 'circle' });
    updateButtonStates(circleButton);
  });

  rectangleButton.addEventListener('click', () => {
    sendMessageToContent({ action: 'shape', shape: 'rectangle' });
    updateButtonStates(rectangleButton);
  });

  arrowButton.addEventListener('click', () => {
    sendMessageToContent({ action: 'shape', shape: 'arrow' });
    updateButtonStates(arrowButton);
  });

  highlighterButton.addEventListener('click', () => {
    sendMessageToContent({ action: 'highlighter' });
  });

  clearButton.addEventListener('click', () => {
    sendMessageToContent({ action: 'clear' });
  });

  colorPicker.addEventListener('change', (event) => {
    const color = event.target.value;
    sendMessageToContent({ action: 'setColor', color: color });
  });

  saveButton.addEventListener('click', () => {
    sendMessageToContent({ action: 'save' });
  });

  const updateButtonStates = (activeButton) => {
    const buttons = [penButton, eraserButton, highlighterButton, circleButton, rectangleButton, arrowButton];
    buttons.forEach(button => {
      if (button === activeButton) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  };

  penButton.addEventListener('click', () => updateButtonStates(penButton));
  eraserButton.addEventListener('click', () => updateButtonStates(eraserButton));
  highlighterButton.addEventListener('click', () => updateButtonStates(highlighterButton));
  circleButton.addEventListener('click', () => updateButtonStates(circleButton));
  rectangleButton.addEventListener('click', () => updateButtonStates(rectangleButton));
  arrowButton.addEventListener('click', () => updateButtonStates(arrowButton));

  chrome.storage.sync.get(['enabled', 'currentTool', 'color'], (result) => {
    toggleButton.checked = result.enabled || false;
    colorPicker.value = result.color || '#000000';
    if (result.currentTool) {
      updateButtonStates(document.getElementById(`${result.currentTool}Button`));
    }
  });
});
