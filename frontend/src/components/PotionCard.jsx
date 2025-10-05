import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Droplets, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';


export const PotionCard = ({
  id,
  pillName,
  dosage,
  times,
  quantity,
  isRefillDue = false,
  canLog = false,
  onEdit,
  onDelete,
  onLogTaken
}) => {

  const handleLogTaken = () => {
    if (onLogTaken && canLog && quantity>0) {
      onLogTaken(id);
      toast.success(`${pillName} has been logged as taken ✨`)
    }
  };

  return (

      <Card className="potion-card group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-5 w-5 text-magical-blue elixir-glow" />
            <h3 className="font-bold text-lg text-foreground">{pillName}</h3>
            {isRefillDue && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Refill Due
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mb-3">{dosage}</p>

          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-magical-purple" />
            <div className="flex gap-1 flex-wrap">
              {times.map((time, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {time}
                </Badge>
              ))}
            </div>
          </div>

          {quantity != null && (
            <p className="text-sm text-muted-foreground mb-4">
              Remaining: {quantity} doses
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleLogTaken}
          className="magical-button flex-1"
          disabled={!canLog || quantity<=0}
        >
          {canLog && quantity > 0 ? "Log as Taken" : "Not Available"}
        </Button>
      </div>
    </Card>

    
  );
};
