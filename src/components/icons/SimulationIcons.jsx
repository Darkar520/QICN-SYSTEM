import React from 'react';

// Simulación de Iconos Lucide-React para Entorno Monolítico (Evita errores de importación)
export const Icon = ({ className = "w-5 h-5", children, title = "Icono" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <title>{title}</title>
    {children}
  </svg>
);

export const GenericIcon = ({ title, className = "w-5 h-5", children }) => (
  <Icon className={className} title={title}>
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 8v4l3 3"></path>
    {children}
  </Icon>
);

// Define los iconos más usados y usa GenericIcon para el resto
export const Brain = (props) => <Icon {...props} title="Brain"><path d="M9 18H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l4-5 4 5h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4"></path></Icon>;
export const Network = (props) => <Icon {...props} title="Network"><path d="M17 16l-3-3l-2 5l-4-4l5-2l-3-3z"></path></Icon>;
export const Zap = (props) => <Icon {...props} title="Zap"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>;
export const Activity = (props) => <Icon {...props} title="Activity"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>;
export const TrendingUp = (props) => <Icon {...props} title="TrendingUp"><polyline points="22 7 13 16 9 12 2 19"></polyline><polyline points="16 7 22 7 22 13" /></Icon>;
export const Pause = (props) => <Icon {...props} title="Pause"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></Icon>;
export const Play = (props) => <Icon {...props} title="Play"><polygon points="5 3 19 12 5 21 5 3"></polygon></Icon>;
export const RotateCcw = (props) => <Icon {...props} title="RotateCcw"><path d="M1 4v6h6" /><path d="M3.52 15.98a8 8 0 1 0 .97-9.58" /></Icon>;
export const Cpu = (props) => <Icon {...props} title="Cpu"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 12h8V4M4 4h8v8M4 12h8v8M12 12v8h8M12 4v8h8M4 12h8v8M4 4v8h8" /></Icon>;
export const Database = (props) => <Icon {...props} title="Database"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></Icon>;
export const Layers = (props) => <Icon {...props} title="Layers"><path d="M12 19l-9-5.5L12 8l9 5.5z" /><path d="M21 19l-9 5.5L3 19" /></Icon>;
export const Feather = (props) => <Icon {...props} title="Feather"><path d="M20.24 12.24a4 4 0 0 0-5.66-5.66L10 16.34l-4.24-4.24a4 4 0 0 0-5.66 5.66L10 21.66l4.24-4.24a4 4 0 0 0 5.66 0z" /></Icon>;
export const Settings = (props) => <Icon {...props} title="Settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.22a2 2 0 0 1-2 2h-.22a2 2 0 0 0-2 2v.44a2 2 0 0 1-2 2H2a2 2 0 0 0 0 4h2.22a2 2 0 0 1 2 2v.22a2 2 0 0 0 2 2h.44a2 2 0 0 1 2 2v.22a2 2 0 0 0 4 0v-.22a2 2 0 0 1 2-2h.44a2 2 0 0 0 2-2v-.44a2 2 0 0 1 2-2h2.22a2 2 0 0 0 0-4h-2.22a2 2 0 0 1-2-2v-.44a2 2 0 0 0-2-2h-.44a2 2 0 0 1-2-2V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></Icon>;
export const LineChart = (props) => <Icon {...props} title="LineChart"><path d="M3 3v18h18" /><path d="M18 17l-6-6-4 4-3-3" /></Icon>;
export const BookOpen = (props) => <Icon {...props} title="BookOpen"><path d="M2 3h6a4 4 0 0 1 4 4v14H4a2 2 0 0 1-2-2V3z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14h8a2 2 0 0 0 2-2V3z" /></Icon>;
export const Eye = (props) => <Icon {...props} title="Eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Icon>;
export const Code = (props) => <Icon {...props} title="Code"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></Icon>;
export const Waves = (props) => <Icon {...props} title="Waves"><path d="M2 6.16c3-1.6 7-1.6 10 0 3 1.6 7 1.6 10 0" /></Icon>;
export const Target = (props) => <Icon {...props} title="Target"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Icon>;
export const Sparkles = (props) => <Icon {...props} title="Sparkles"><path d="M19 12a7 7 0 0 1 0 10l-2-2" /><path d="M2 13.5a7 7 0 0 1 12 0L8 20.5a7 7 0 0 1-12 0l6-7.5z" /><path d="M21 7L17 3" /></Icon>;
export const TrendingDown = (props) => <Icon {...props} title="TrendingDown"><polyline points="2 17 8 11 12 15 22 5" /><polyline points="18 17 22 17 22 13" /></Icon>;
export const InfinityIcon = (props) => <Icon {...props} title="Infinity"><path d="M17 12H3" /><path d="M20 16a4 4 0 0 0 0-8" /><path d="M4 16a4 4 0 0 1 0-8" /></Icon>;
export const Microscope = (props) => <Icon {...props} title="Microscope"><path d="M7 19h10" /><path d="M15 21v-2" /><path d="M9 21v-2" /><path d="M5 2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10H5V2z" /><path d="M5 12h14" /></Icon>;
export const MessageSquare = (props) => <Icon {...props} title="MessageSquare"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon>;
export const ShieldCheck = (props) => <Icon {...props} title="ShieldCheck"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></Icon>;
export const Sun = (props) => <Icon {...props} title="Sun"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 18.36l1.42-1.42M18.36 5.64l1.42-1.42" /></Icon>;
export const Users = (props) => <Icon {...props} title="Users"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>;
export const Lightbulb = (props) => <Icon {...props} title="Lightbulb"><path d="M9 18h6" /><path d="M10 14h4" /><path d="M12 2v2" /><path d="M12 4v4" /><path d="M10 8h4" /><path d="M10 12h4" /><path d="M10 16h4" /><path d="M12 20v2" /></Icon>;
