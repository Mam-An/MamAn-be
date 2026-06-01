import { useState, useEffect } from 'react';

type PlantState = 'normal' | 'happy' | 'sad' | 'tired' | 'dead';
type GrowthStage = 'seed' | 'sprout' | 'plant' | 'flower';

const MAX_HEALTH = 100;
const HEALTH_DECAY_RATE = 2; // health lost per second
const TICK_RATE = 1000; // ms

function App() {
  const [health, setHealth] = useState(50);
  const [exp, setExp] = useState(0);
  const [stage, setStage] = useState<GrowthStage>('seed');
  const [plantState, setPlantState] = useState<PlantState>('normal');
  const [message, setMessage] = useState('');
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [isFeeding, setIsFeeding] = useState(false);

  // Growth thresholds
  const growthThresholds = {
    seed: 0,
    sprout: 50,
    plant: 150,
    flower: 300,
  };

  // Game Loop
  useEffect(() => {
    if (plantState === 'dead') return;

    const timer = setInterval(() => {
      setHealth((prev) => {
        const newHealth = Math.max(0, prev - HEALTH_DECAY_RATE);
        
        // Update state based on health
        if (newHealth === 0) setPlantState('dead');
        else if (newHealth < 30) setPlantState('tired');
        else if (newHealth < 60) setPlantState('sad');
        else if (plantState !== 'happy') setPlantState('normal');

        return newHealth;
      });
    }, TICK_RATE);

    return () => clearInterval(timer);
  }, [plantState]);

  // Update growth stage based on exp
  useEffect(() => {
    if (exp >= growthThresholds.flower) setStage('flower');
    else if (exp >= growthThresholds.plant) setStage('plant');
    else if (exp >= growthThresholds.sprout) setStage('sprout');
  }, [exp]);

  const feedPlant = (amount: number, resourceName: string) => {
    if (plantState === 'dead') return;

    setHealth((prev) => Math.min(MAX_HEALTH, prev + amount));
    setExp((prev) => prev + amount);
    setPlantState('happy');
    setIsFeeding(true);
    
    // Plant says thanks
    showSpeechBubble(`Cảm ơn bạn đã cho mình ${resourceName}! 🌿`);
    
    setTimeout(() => {
      setPlantState('normal');
      setIsFeeding(false);
    }, 3000);
  };

  const showSpeechBubble = (text: string) => {
    setSpeechBubble(text);
    setTimeout(() => setSpeechBubble(null), 4000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || plantState === 'dead') return;
    
    setExp((prev) => prev + 10);
    setPlantState('happy');
    showSpeechBubble(`Trái tim mình rung động vì: "${message}" 💚`);
    setMessage('');
    
    setTimeout(() => {
      setPlantState('normal');
    }, 4000);
  };

  const restartGame = () => {
    setHealth(50);
    setExp(0);
    setStage('seed');
    setPlantState('normal');
    setSpeechBubble('Chào mừng trở lại! 🌱');
  };

  // Select mascot image based on state
  const getMascotImage = () => {
    switch (plantState) {
      case 'happy': return '/plants/happy.png';
      case 'sad': return '/plants/sad.png';
      case 'tired': return '/plants/tired.png';
      case 'dead': return '/plants/axious.png';
      default: return '/plants/normal.png';
    }
  };

  const getStageName = () => {
    switch (stage) {
      case 'seed': return 'Mầm nhỏ';
      case 'sprout': return 'Cây non';
      case 'plant': return 'Trưởng thành';
      case 'flower': return 'Ra hoa';
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F7EF] flex flex-col items-center py-10 px-4 font-sans text-[#143D25]">
      
      {/* Header */}
      <div className="w-full max-w-md mb-6 px-2">
        <h1 className="text-[22px] font-bold text-[#143D25]">Cây của bạn 👋</h1>
        <p className="text-[13px] text-[#6F8F78] mt-1">Đừng quên tưới nước để cây sống sót nhé 🌿</p>
      </div>

      {/* Main Card (Matching Mobile PlantCard) */}
      <div className="w-full max-w-md bg-white rounded-[24px] p-6 flex flex-col items-center gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-[#E8F3E8]">
        
        {/* Mascot Area */}
        <div className="relative pt-10 flex items-center justify-center">
          {/* Speech Bubble */}
          {speechBubble && (
            <div className="absolute top-[-10px] bg-white px-4 py-3 rounded-[20px] shadow-[0_4px_12px_rgba(20,61,37,0.1)] border-[1.5px] border-[#E8F3E8] z-10 max-w-[220px]">
              <p className="text-[14px] text-[#143D25] font-medium text-center leading-5">{speechBubble}</p>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white"></div>
            </div>
          )}

          {/* Avatar */}
          <div className={`w-48 h-48 sm:w-56 sm:h-56 transition-transform duration-300 ${plantState === 'happy' ? 'scale-110' : ''} ${plantState !== 'dead' && !isFeeding ? 'animate-float' : ''} ${plantState === 'dead' ? 'grayscale opacity-80' : ''}`}>
            <img 
              src={getMascotImage()} 
              alt="Plant Mascot" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Status / Streak Badge */}
        <div className="flex items-center gap-2 bg-[#F0FAF0] px-[14px] py-[6px] rounded-[20px]">
          <span className="text-[14px]">🌱</span>
          <span className="text-[13px] font-semibold text-[#143D25]">
            {plantState === 'dead' ? 'Cây đã héo úa' : `Tình trạng: ${health}% Nước`}
          </span>
        </div>

        {/* Progress Bar Area */}
        <div className="w-full mt-2">
          <div className="flex justify-between items-center mb-[6px]">
            <span className="text-[14px] font-bold text-[#143D25]">{getStageName()}</span>
            <span className="text-[13px] font-semibold text-[#4ADE80]">{exp} EXP</span>
          </div>
          <div className="w-full h-3 bg-[#F0FAF0] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#4ADE80] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (exp % 150) / 1.5)}%` }} // Just a visual mock progress
            ></div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md mt-6 gap-4 flex flex-col">
        {plantState === 'dead' ? (
          <button 
            onClick={restartGame}
            className="w-full bg-[#143D25] text-white font-semibold py-4 rounded-[16px] active:scale-95 transition-transform"
          >
            Trồng Mầm Mới 🌱
          </button>
        ) : (
          <>
            <div className="flex gap-4">
              <button 
                onClick={() => feedPlant(15, 'Nước')}
                className="flex-1 bg-[#E6F4FE] text-[#0284C7] font-semibold py-4 rounded-[16px] active:scale-95 transition-transform flex flex-col items-center"
              >
                <span className="text-2xl mb-1">💧</span>
                Tưới Nước
              </button>
              <button 
                onClick={() => feedPlant(20, 'Phân bón')}
                className="flex-1 bg-[#FEF3C7] text-[#D97706] font-semibold py-4 rounded-[16px] active:scale-95 transition-transform flex flex-col items-center"
              >
                <span className="text-2xl mb-1">✨</span>
                Bón Phân
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 mt-2">
              <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Gửi lời nhắn cho cây..." 
                className="flex-1 bg-white border border-[#E8F3E8] rounded-[16px] px-4 py-3 outline-none focus:border-[#4ADE80] text-[15px]"
              />
              <button 
                type="submit"
                disabled={!message.trim()}
                className="bg-[#143D25] disabled:bg-[#6F8F78] text-white font-semibold px-6 rounded-[16px] active:scale-95 transition-transform"
              >
                Gửi
              </button>
            </form>
          </>
        )}
      </div>

    </div>
  );
}

export default App;
