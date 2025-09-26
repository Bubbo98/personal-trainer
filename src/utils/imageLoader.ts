// Helper function per caricare le immagini delle sezioni timeline
export const getTimelineImages = (sectionIndex: number): string[] => {
  // Mappatura numeri a nomi delle cartelle
  const sectionNames = [
    'Primo',
    'Secondo',
    'Terzo',
    'Quarto',
    'Quinto',
    'Sesto',
    'Settimo',
    'Ottavo',
    'Nono',
    'Decimo',
    'Undicesimo'
  ];

  const sectionName = sectionNames[sectionIndex];
  if (!sectionName) return [];

  // Configurazione immagini per sezione (basata sui contenuti effettivi delle cartelle)
  const imageConfigs: { [key: string]: number } = {
    'Primo': 2,
    'Secondo': 1,
    'Terzo': 1,
    'Quarto': 5,
    'Quinto': 5,
    'Sesto': 2,
    'Settimo': 3,
    'Ottavo': 2,
    'Nono': 4,
    'Decimo': 4,
    'Undicesimo': 1
  };

  const imageCount = imageConfigs[sectionName] || 1;
  const images: string[] = [];

  for (let i = 1; i <= imageCount; i++) {
    images.push(`/ChiSono/${sectionName}/${i}.jpg`);
  }

  return images;
};

// Funzione per verificare quante immagini ha ogni cartella (per future configurazioni)
export const scanTimelineImages = async (): Promise<{ [key: string]: number }> => {
  // Questa funzione potrebbe essere usata per scansionare dinamicamente le cartelle
  // Per ora restituiamo la configurazione statica
  return {
    'Primo': 2,
    'Secondo': 1,
    'Terzo': 1,
    'Quarto': 1,
    'Quinto': 1,
    'Sesto': 1,
    'Settimo': 1,
    'Ottavo': 1,
    'Nono': 1,
    'Decimo': 1,
    'Undicesimo': 1
  };
};