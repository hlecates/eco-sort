# EcoSort: AI-Powered Waste Classification

EcoSort is a web-based application that uses computer vision to classify waste materials and provide recycling guidance. I grew up in a household that took recycling seriously, and even with that background, I learned how confusing, and sometimes daunting, it can be to sort things correctly. Will I make the right call? Could I be dooming the planet? EcoSort is one small step toward making that decision easier: snap a photo and get a clear bin recommendation backed by AI.

## Model Architecture

### Core Model: MobileNetV3-Small
The project uses **MobileNetV3-Small** as the backbone architecture, chosen for its optimal balance of accuracy and efficiency for mobile/web deployment:

- **Architecture**: MobileNetV3-Small with ImageNet pre-trained weights
- **Input Size**: 224×224 pixels (standard ImageNet resolution)
- **Output**: 6-class classification (glass, paper, cardboard, plastic, metal, trash)
- **Optimization**: ONNX format for cross-platform deployment
- **Inference**: Client-side using ONNX Runtime Web with WASM

### Classification Hierarchy
The model implements a two-level classification system:

```
Material Classification (6 classes)
├── Glass → Recycle
├── Paper → Recycle  
├── Cardboard → Recycle
├── Plastic → Recycle
├── Metal → Recycle
└── Trash → Landfill
```

### Training Configuration
- **Data Augmentation**: Color jittering, Gaussian blur, random transformations
- **Normalization**: ImageNet mean/std values (`[0.485, 0.456, 0.406]` / `[0.229, 0.224, 0.225]`)
- **Loss Function**: Cross-entropy loss
- **Optimizer**: Adam with learning rate scheduling
- **Validation Split**: 10% stratified split

## Data Construction

### Dataset Structure
The training dataset consists of **2,527 images** organized into 6 material categories:

```
data/raw/
├── glass/    
├── paper/      
├── cardboard/ 
├── plastic/   
├── metal/     
└── trash/     
```

### Data Processing Pipeline
1. **Manifest Creation**: `data/create_manifest.py` processes the raw dataset
   - Parses `zero-indexed-files.txt` with filename-label pairs
   - Maps material IDs to bin categories
   - Generates CSV manifest with paths and labels

2. **Stratified Splitting**: Ensures balanced representation across classes
   - Training: 90% of data
   - Validation: 10% of data
   - Test: Optional split for final evaluation

3. **Preprocessing**: Standard ImageNet normalization and augmentation
   - Resize to 224×224
   - Color jittering and blur for training
   - Tensor normalization


## Web Application

EcoSort is hosted on Cloudflare at https://eco-sort.pages.dev/.

### Key Features
- **Dual Input Methods**: File upload + camera capture
- **Real-time Processing**: Instant classification results
- **Responsive Design**: Works on desktop and mobile

### Basic Usage
1. **Open the app** in your browser
2. **Upload a photo** or **take a picture** using your camera
3. **View results** with confidence percentage and bin recommendation
4. **Follow recycling tips** provided for each material type

### Example Classifications

#### High Confidence Example
<img src="docs/online_recycle.png" alt="EcoSort app showing high confidence recycling classification" width="600" height="auto" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

**Scenario**: Clear plastic water bottle
- **Result**: RECYCLE · plastic (94.9%)

#### Low Confidence Example
<img src="docs/mobile_unsual.png" alt="EcoSort app showing low confidence classification" width="300" height="auto" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

**Scenario**: Unrelated Picture
- **Result**: UNSURE (52.3%)

## Flyer & QR Code

With the goal of promoting sustainability and proper practices the following flyer (EcoSort_Flyer.png), advertises the hosted web app via a QR code. With the goal of being posted where people must make recycling descisions, at stores, schools, dumps, etc, EcoSort hopefully, in due time, will make a small contribution to saving the world. 

<img src="EcoSort_Flyer.png" alt="EcoSort Flyer" width="800" height="auto" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

## Next Steps

- Refine and optimize the model.
   - Gather more images to train on
   - Account for certain types of plastics and cardboard that can not be recycled (ie pizza boxes (due to grease))
- Expand the UI
   - Allow for user to critic model results / report incorrect assumptions which then save the photo
   - Allow for users to submit photos of items, with proper labeling
