export interface Mission {
    _id: string;
    missionId: {
        type: string;
        params: any;
        rewardXP: number;
    };
    params: any;
    progress: any;
    completed: boolean;
    description: string;
    date: string;
}

export interface UserMission extends Mission {
    claimable: boolean;
}