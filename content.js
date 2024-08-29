if (!document.getElementById('webpage-drawer-canvas')) {
  let drawing = false;
  let currentTool = 'pen';
  let color = '#000000';
  let enabled = false;
  let canvas, context;
  let startX, startY;
  let currentShape = null;
  let shapes = [];
  let highlights = [];
  let currentHighlight = null;
  let paths = [];

  const createCanvas = () => {
    canvas = document.createElement('canvas');
    canvas.id = 'webpage-drawer-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.zIndex = 10000;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    context = canvas.getContext('2d');

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    chrome.runtime.onMessage.addListener(handleMessage);
  };

  const handleMouseDown = (e) => {
    if (!enabled) return;
    drawing = true;
    startX = e.clientX;
    startY = e.clientY;
    if (currentTool === 'highlighter') {
      currentHighlight = {
        startX: startX,
        startY: startY,
        endX: startX,
        endY: startY,
        color: color
      };
    } else if (currentTool === 'pen') {
      context.beginPath();
      context.moveTo(startX, startY);
      paths.push({ tool: 'pen', color: color, points: [{x: startX, y: startY}] });
    } else if (currentTool === 'eraser') {
      eraseAt(startX, startY);
    }
  };

  const handleMouseMove = (e) => {
    if (!enabled || !drawing) return;
    if (currentTool === 'pen') {
      drawFreehand(e);
    } else if (currentTool === 'eraser') {
      eraseAt(e.clientX, e.clientY);
    } else if (currentTool === 'shape') {
      drawShape(e);
    } else if (currentTool === 'highlighter') {
      drawHighlighter(e);
    }
  };

  const handleMouseUp = (e) => {
    if (!enabled) return;
    drawing = false;
    if (currentTool === 'shape') {
      finalizeShape(e);
    } else if (currentTool === 'highlighter') {
      finalizeHighlight(e);
    }
  };

  const drawFreehand = (e) => {
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineTo(e.clientX, e.clientY);
    context.stroke();
    paths[paths.length - 1].points.push({x: e.clientX, y: e.clientY});
  };

  const eraseAt = (x, y) => {
    const eraseRadius = 10;
    paths = paths.filter(path => !isPathUnderPoint(path, x, y, eraseRadius));
    shapes = shapes.filter(shape => !isShapeUnderPoint(shape, x, y));
    highlights = highlights.filter(highlight => !isHighlightUnderPoint(highlight, x, y, eraseRadius));
    redrawCanvas();
  };

  const isPathUnderPoint = (path, x, y, radius) => {
    return path.points.some(point => 
      Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)) <= radius
    );
  };

  const isShapeUnderPoint = (shape, x, y) => {
    switch (shape.type) {
      case 'circle':
        const centerX = (shape.startX + shape.endX) / 2;
        const centerY = (shape.startY + shape.endY) / 2;
        const radius = Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2)) / 2;
        return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) <= radius;
      case 'rectangle':
        return x >= Math.min(shape.startX, shape.endX) && x <= Math.max(shape.startX, shape.endX) &&
               y >= Math.min(shape.startY, shape.endY) && y <= Math.max(shape.startY, shape.endY);
      case 'arrow':
        const lineLength = Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2));
        const distance = Math.abs((shape.endY - shape.startY) * x - (shape.endX - shape.startX) * y + shape.endX * shape.startY - shape.endY * shape.startX) / lineLength;
        return distance <= 5;
      default:
        return false;
    }
  };

  const isHighlightUnderPoint = (highlight, x, y, radius) => {
    const centerX = (highlight.startX + highlight.endX) / 2;
    const centerY = (highlight.startY + highlight.endY) / 2;
    return Math.sqrt(Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2)) <= radius;
  };

  const drawShape = (e) => {
    const width = e.clientX - startX;
    const height = e.clientY - startY;

    redrawCanvas();
    context.beginPath();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 2;

    switch (currentShape) {
      case 'circle':
        const radius = Math.sqrt(width * width + height * height) / 2;
        const centerX = startX + width / 2;
        const centerY = startY + height / 2;
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        break;
      case 'rectangle':
        context.rect(startX, startY, width, height);
        break;
      case 'arrow':
        drawArrow(startX, startY, e.clientX, e.clientY);
        break;
    }

    context.stroke();
  };

  const drawHighlighter = (e) => {
    if (currentHighlight) {
      currentHighlight.endX = e.clientX;
      currentHighlight.endY = e.clientY;
      redrawCanvas();
      drawHighlightLine(currentHighlight);
    }
  };

  const drawHighlightLine = (highlight) => {
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = hexToRGBA(highlight.color, 0.5);
    context.lineWidth = 20;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(highlight.startX, highlight.startY);
    context.lineTo(highlight.endX, highlight.endY);
    context.stroke();
  };

  const finalizeShape = (e) => {
    shapes.push({
      type: currentShape,
      startX: startX,
      startY: startY,
      endX: e.clientX,
      endY: e.clientY,
      color: color
    });
    redrawCanvas();
  };

  const finalizeHighlight = (e) => {
    if (currentHighlight) {
      currentHighlight.endX = e.clientX;
      currentHighlight.endY = e.clientY;
      highlights.push(currentHighlight);
      currentHighlight = null;
      redrawCanvas();
    }
  };

  const drawArrow = (fromX, fromY, toX, toY) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    context.moveTo(toX, toY);
    context.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
  };

  const hexToRGBA = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleMessage = (request, sender, sendResponse) => {
    if (request.action === 'enable') {
      enabled = true;
      canvas.style.pointerEvents = 'auto';
    } else if (request.action === 'disable') {
      enabled = false;
      canvas.style.pointerEvents = 'none';
    } else if (request.action === 'pen') {
      currentTool = 'pen';
    } else if (request.action === 'eraser') {
      currentTool = 'eraser';
    } else if (request.action === 'shape') {
      currentTool = 'shape';
      currentShape = request.shape;
    } else if (request.action === 'highlighter') {
      currentTool = 'highlighter';
    } else if (request.action === 'clear') {
      shapes = [];
      highlights = [];
      paths = [];
      redrawCanvas();
    } else if (request.action === 'save') {
      saveCanvas();
    } else if (request.action === 'setColor') {
      color = request.color;
    }
    sendResponse({status: 'success'});
  };

  const redrawCanvas = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw paths (freehand and eraser)
    paths.forEach(path => {
      context.beginPath();
      context.strokeStyle = path.color;
      context.lineWidth = 2;
      context.globalCompositeOperation = 'source-over';
      context.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(point => {
        context.lineTo(point.x, point.y);
      });
      context.stroke();
    });

    // Draw highlights
    highlights.forEach(drawHighlightLine);

    // Draw shapes
    shapes.forEach(shape => {
      context.beginPath();
      context.strokeStyle = shape.color;
      context.fillStyle = shape.color;
      context.lineWidth = 2;

      switch (shape.type) {
        case 'circle':
          const width = shape.endX - shape.startX;
          const height = shape.endY - shape.startY;
          const radius = Math.sqrt(width * width + height * height) / 2;
          const centerX = shape.startX + width / 2;
          const centerY = shape.startY + height / 2;
          context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          break;
        case 'rectangle':
          context.rect(shape.startX, shape.startY, shape.endX - shape.startX, shape.endY - shape.startY);
          break;
        case 'arrow':
          drawArrow(shape.startX, shape.startY, shape.endX, shape.endY);
          break;
      }

      context.stroke();
    });

    if (currentHighlight) {
      drawHighlightLine(currentHighlight);
    }
  };

  const saveCanvas = () => {
    // First, get the dimensions of the visible viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
  
    // Adjust the canvas size to match the viewport
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
  
    // Redraw the canvas content to fit the new dimensions
    redrawCanvas();
  
    chrome.runtime.sendMessage({action: 'captureVisibleTab'}, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error capturing screenshot:", chrome.runtime.lastError.message);
      } else {
        const screenshotImg = new Image();
        screenshotImg.onload = () => {
          const combinedCanvas = document.createElement('canvas');
          combinedCanvas.width = viewportWidth;
          combinedCanvas.height = viewportHeight;
          const combinedContext = combinedCanvas.getContext('2d');
  
          // Draw the screenshot
          combinedContext.drawImage(screenshotImg, 0, 0, viewportWidth, viewportHeight);
          
          // Draw the canvas content
          combinedContext.drawImage(canvas, 0, 0);
  
          // Create and trigger download
          const link = document.createElement('a');
          link.download = 'doodled_webpage.png';
          link.href = combinedCanvas.toDataURL('image/png');
          link.click();
  
          // Reset the canvas to its original size if necessary
          // canvas.width = originalWidth;
          // canvas.height = originalHeight;
          // redrawCanvas();
        };
        screenshotImg.src = response.dataUrl;
      }
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createCanvas);
  } else {
    createCanvas();
  }
}