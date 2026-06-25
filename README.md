# GLB Editor

A web-based 3D model editor for GLB (glTF Binary) files with advanced skeleton and animation editing capabilities.

## Features

### Model Management
- Drag-and-drop or file picker support for loading GLB files
- Interactive 3D viewport with orbit controls
- Automatic model centering and zoom controls
- Automatic scaling for very small models (< 0.1 units) with user notification
- Skeleton helper visualization for skinned meshes
- Enhanced camera adjustment based on model size
- Save modified models back to GLB format

### Animation Tools
- View and play all animations in the model
- Rename animations with validation (prevents duplicates and reserved names)
- Play/pause animation controls
- Animation name history saved in local storage for quick reuse

### Skeleton Editing
- Visual bone hierarchy display
- Individual bone rotation editing (X, Y, Z axes)
- Real-time rotation preview in both radians and degrees
- Copy and paste bone rotations between bones
- Reset individual bones to their original rotations
- Export/import entire skeleton configurations as JSON
- **Auto-updating skeleton JSON**: Edit JSON in the textarea and changes apply automatically after 500ms
- **Reset Skeleton**: Quickly restore all bones to their original positions
- Supports both array and object formats for skeleton JSON import

### Bone Management
- Complete bone list with parent relationships
- Hierarchical bone tree view
- Copy individual or all bone names to clipboard
- Parent-child relationship visualization

### User Interface
- Custom modal dialog system for alerts and confirmations
- Smooth animations for modal dialogs
- Improved user feedback with non-blocking notifications
- Real-time visual feedback for button actions

## Getting Started

### Prerequisites
- Node.js (v14 or higher recommended)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Usage

1. Open the application in your browser
2. Load a GLB file by:
   - Clicking the "Load GLB File" area
   - Dragging and dropping a `.glb` file onto the drop zone
3. Use the left panel for bone management and model loading
4. Use the right panel for skeleton editing and animation controls

## Technology Stack

- **Three.js** - 3D rendering engine
- **glTF Transform** - GLB file processing
- **Vite** - Build tool and development server
- **Vanilla JavaScript** - No framework dependencies

## Project Structure

```
glbEdit/
├── index.html          # Main HTML file with UI layout
├── src/
│   └── main.js         # Application logic and Three.js setup
├── package.json        # Project dependencies and scripts
└── vite.config.js      # Vite configuration
```

## Key Controls

### Viewport
- **Left Mouse**: Rotate camera (orbit)
- **Right Mouse**: Pan camera
- **Mouse Wheel**: Zoom in/out
- **+ / - buttons**: Manual zoom controls

### Skeleton Editor
- Select a bone from the dropdown
- Adjust rotation using sliders or numeric inputs
- Use "Copy Single Bone" / "Paste Single Bone" for quick duplication
- "Reset Bone" restores original rotation

### Export/Import
- **Export Skeleton to JSON**: Saves complete skeleton configuration including bone rotations, positions, and scale
- **Import Skeleton from JSON**: Loads previously saved skeleton data with validation
- **Auto-Apply JSON Edits**: Changes made in the JSON textarea automatically apply to the model after 500ms
- **Reset Skeleton**: Clear all modifications and restore bones to original positions
- **Copy JSON to Clipboard**: Quick button to copy skeleton JSON data
- **Save Modified GLB**: Downloads the edited model with all modifications preserved
- Supports both array format `[{name, rotation}]` and object format `{boneName: {rotation}}` for JSON import

## Data Persistence

- Animation names are saved to browser local storage
- Previously used animation names appear in autocomplete suggestions

## Advanced Features

### Automatic Model Scaling
When loading very small models (smaller than 0.1 units), the editor automatically scales them up for better visibility. The scaling factor is preserved when you save the GLB file, so you don't need to manually scale in external tools.

### Skeleton Visualization
For models with skinned meshes, a skeleton helper is automatically created and displayed, making it easier to visualize bone hierarchies and transformations in 3D space.

### Smart JSON Editing
The skeleton JSON textarea features auto-apply functionality:
- Changes are automatically applied to the model after 500ms of inactivity
- No need to manually click "Import" after each edit
- Syntax errors are silently ignored while typing
- Supports flexible JSON formats for easier manual editing

### Enhanced Debugging
The application includes extensive console logging for:
- Model loading diagnostics
- Mesh and material information
- Skeleton helper creation
- Camera adjustments
- JSON import/export operations

## Browser Compatibility

Works in all modern browsers with WebGL support:
- Chrome/Edge (recommended)
- Firefox
- Safari

## License

ISC

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.
