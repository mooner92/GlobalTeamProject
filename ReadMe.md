# KEI Project Search by Research Focus

A web-based tool for browsing and filtering Korea Environment Institute (KEI) research projects by research focus areas, with export capabilities to PDF and Excel formats.

## Overview

### Purpose
This project provides an intuitive interface to:
- Browse KEI research projects organized by research focus areas
- Filter projects by selecting one or multiple research focus categories
- Export selected projects to PDF or Excel format for sharing with external researchers and partner institutions
- Facilitate collaboration and knowledge sharing across institutions

### Background
This project is a collaborative effort between:
- **KEI AI Data Team**: Responsible for data management, technical implementation, and AI/data infrastructure
- **KEI Global Cooperation Team**: Focused on international research collaboration and partnership development

## Features

- **Dynamic Filtering**: Select one or more research focus areas to filter projects instantly
- **Interactive UI**: Modern, responsive interface with visual feedback
- **Multi-select Export**: Choose specific projects for export
- **Dual Export Formats**: 
  - **PDF**: Formatted document with complete project details
  - **Excel**: Structured data table with metadata sheet
- **Real-time Statistics**: View project counts and selected items at a glance
- **Keyboard Shortcuts**: Efficient navigation and actions

## Technology Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Libraries**:
  - [SheetJS (xlsx.js)](https://github.com/SheetJS/sheetjs) - Excel file parsing
  - [jsPDF](https://github.com/parallax/jsPDF) - PDF generation
  - [html2canvas](https://github.com/niklasvh/html2canvas) - HTML to canvas rendering for PDF

## Installation & Usage

### Quick Start

1. **Clone the repository**
```bash
   git clone https://github.com/yourusername/kei-project-search.git
   cd kei-project-search
```

2. **Open the application**
   - Simply open `index.html` in a modern web browser
   - No server setup required - runs entirely client-side

3. **Start browsing**
   - Research focus areas will load automatically
   - Click on focus areas to filter projects
   - Select projects using checkboxes
   - Export using PDF or Excel buttons

### Updating Project Data

The application reads project data from `data/projects.xlsx`. To update the project list:

1. **Prepare your Excel file**
   - Ensure the file contains a sheet named `List`
   - The sheet must include these columns (case-insensitive):
     - `No.` - Project number/ID
     - `Type` - Project type/category
     - `Title` - Project title
     - `PI` - Principal Investigator name
     - `Primary Focus` - Main research focus area
     - `Secondary Focus` - Secondary research focus area
     - `Project Start` - Start date
     - `Project End` - End date

2. **Replace the data file**
```bash
   # Rename your file to projects.xlsx
   mv your-updated-file.xlsx data/projects.xlsx
```

3. **Verify the update**
   - Refresh the web page
   - Check that new projects appear and statistics are updated

### Excel File Requirements

**Required sheet name**: `List`

**Column format example**:

| No.  | Type  | Title                       | PI       | Primary Focus  | Secondary Focus | Project Start | Project End |
| ---- | ----- | --------------------------- | -------- | -------------- | --------------- | ------------- | ----------- |
| 1    | Basic | Climate Change Impact Study | John Doe | Climate Change | Water Resources | 2024-01-01    | 2024-12-31  |

**Important notes**:
- The first row containing "Primary Focus" and "Secondary Focus" is detected as the header
- Dates can be in Excel date format or text format (will be automatically converted)
- Empty cells are handled gracefully
- Case-insensitive header matching

## Project Structure
```
kei-project-search/
│
├── index.html              # Main application file (all-in-one)
├── data/
│   └── projects.xlsx       # Project data source (List sheet)
├── README.md               # This file
└── LICENSE                 # License information
```

## How It Works

### Data Loading Process

1. **Excel Parsing**: On page load, the application fetches `data/projects.xlsx` using the browser's Fetch API
2. **Sheet Reading**: Uses SheetJS to parse the Excel file and locate the `List` sheet
3. **Header Detection**: Automatically finds the header row by searching for "Primary Focus" and "Secondary Focus"
4. **Data Extraction**: Maps columns to project properties and validates data
5. **Research Focus Aggregation**: Extracts unique research focus areas and counts projects per focus

### Filtering Mechanism

- **Normalization**: Research focus names are normalized (case-insensitive, trimmed) for consistent matching
- **Multi-select Logic**: Projects matching ANY selected focus (primary OR secondary) are displayed
- **Dynamic Updates**: UI updates in real-time as selections change

### Export Features

#### PDF Export
- Uses `html2canvas` to render each project card as an image
- Combines images into a multi-page PDF using `jsPDF`
- Includes header with metadata (date, selected focuses, total count)
- Automatic page breaks for long lists
- Fallback to text rendering if image capture fails

#### Excel Export
- Creates a new workbook with two sheets:
  1. **KEI Projects**: Data table with selected projects
  2. **Export Info**: Metadata (date, counts, field descriptions)
- Includes column formatting and styling
- Automatically adjusts column widths

## Keyboard Shortcuts

- `Ctrl + A`: Select all research focus areas
- `Ctrl + D`: Clear all selections
- `Ctrl + S`: Download PDF
- `Ctrl + E`: Download Excel
- `F5`: Refresh data

## Browser Compatibility

Tested and working on:
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

**Note**: Requires a modern browser with ES6+ support and Fetch API.

## Known Limitations

- All processing happens client-side - large Excel files (>5MB) may cause slow loading
- PDF generation with many projects (>100) can take time
- No server-side validation or authentication
- Static mode only - no real-time collaboration features

## Future Enhancements

- [ ] Add search functionality for project titles and PIs
- [ ] Implement date range filtering
- [ ] Add project detail view modal
- [ ] Support multiple Excel files or CSV format
- [ ] Add data visualization (charts, graphs)
- [ ] Implement user preferences storage (localStorage)

## Contributing

This is an internal KEI project. For bug reports or feature requests, please contact:
- AI Data Team: [contact email]
- Global Cooperation Team: [contact email]

## License

[Specify your license here - e.g., MIT, Apache 2.0, or Internal Use Only]

## Acknowledgments

Developed by Korea Environment Institute (KEI)
- AI Data Team: Technical development and data infrastructure
- Global Cooperation Team: Requirements and international collaboration support

---

**Korea Environment Institute (한국환경연구원)**  
Website: https://www.kei.re.kr