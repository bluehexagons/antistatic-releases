export const Ease = {
    backIn: (time, overshoot = 1.70158) => {
        return time * time * ((overshoot + 1) * time - overshoot);
    },
    backOut: (time, overshoot = 1.70158) => {
        time = time - 1;
        return time * time * ((overshoot + 1) * time + overshoot) + 1;
    },
    backInOut: (time, overshoot = 1.70158) => {
        time = time * 2;
        overshoot = overshoot * 1.525;
        if (time < 1) {
            return 0.5 * (time * time * ((overshoot + 1) * time - overshoot));
        }
        else {
            return 0.5 * (time * time * ((overshoot + 1) * time + overshoot) + 2);
        }
    },
    bounceOut: (time) => {
        if (time < 1 / 2.75) {
            return 7.5625 * time * time;
        }
        else if (time < 2 / 2.75) {
            return 7.5625 * (time -= 1.5 / 2.75) * time + 0.75;
        }
        else if (time < 2.5 / 2.75) {
            return 7.5625 * (time -= 2.25 / 2.75) * time + 0.9375;
        }
        else {
            return 7.5625 * (time -= 2.625 / 2.75) * time + 0.984375;
        }
    },
    bounceIn: (time) => {
        return 1 - Ease.bounceOut(1 - time);
    },
    bounceInOut: (time) => {
        if (time < 0.5) {
            return Ease.bounceIn(time * 2) * 0.5;
        }
        else {
            return Ease.bounceOut(time * 2 - 1) * 0.5 + 0.5;
        }
    },
    circIn: (time) => {
        return -(Math.sqrt(1 - time * time) - 1);
    },
    circOut: (time) => {
        time = time - 1;
        return Math.sqrt(1 - time * time);
    },
    circInOut: (time) => {
        time = time * 2;
        if (time < 1) {
            return -0.5 * (Math.sqrt(1 - time * time) - 1);
        }
        else {
            time = time - 2;
            return 0.5 * (Math.sqrt(1 - time * time) + 1);
        }
    },
    cubicIn: (time) => {
        return time * time * time;
    },
    cubicOut: (time) => {
        time = time - 1;
        return time * time * time + 1;
    },
    cubicInOut: (time) => {
        time = time * 2;
        if (time < 1) {
            return 0.5 * time * time * time;
        }
        else {
            time = time - 2;
            return 0.5 * (time * time * time + 2);
        }
    },
    elasticOut: (time, amplitude = 1, period = 0.3) => {
        if (time === 0) {
            return 0;
        }
        else if (time === 1) {
            return 1;
        }
        else {
            const overshoot = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
            return (amplitude
                * 2 ** (-10 * time)
                * Math.sin(((time - overshoot) * (2 * Math.PI)) / period)
                + 1);
        }
    },
    elasticIn: (time, amplitude = 1, period = 0.3) => {
        if (time === 0) {
            return 0;
        }
        else if (time === 1) {
            return 1;
        }
        else {
            const overshoot = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
            time -= 1;
            return (-(amplitude * 2 ** (10 * time))
                * Math.sin(((time - overshoot) * (2 * Math.PI)) / period));
        }
    },
    elasticInOut: (time, amplitude = 1, period = 0.45) => {
        time = time * 2;
        if (time === 0) {
            return 0;
        }
        else if (time === 2) {
            return 1;
        }
        else {
            const overshoot = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
            time = time - 1;
            if (time < 0) {
                return (-0.5
                    * (amplitude * 2 ** (10 * time))
                    * Math.sin((time - overshoot) * ((2 * Math.PI) / period)));
            }
            else {
                return (amplitude
                    * 2 ** (-10 * time)
                    * Math.sin(((time - overshoot) * (2 * Math.PI)) / period)
                    + 1);
            }
        }
    },
    expoIn: (time) => {
        if (time === 0) {
            return 0;
        }
        return 2 ** (10 * (time - 1));
    },
    expoOut: (time) => {
        if (time === 1) {
            return 1;
        }
        return -(2 ** (-10 * time)) + 1;
    },
    expoInOut: (time) => {
        time = time * 2;
        if (time === 0) {
            return 0;
        }
        else if (time === 2) {
            return 1;
        }
        else if (time < 1) {
            return 0.5 * 2 ** (10 * (time - 1));
        }
        else {
            return 0.5 * (-(2 ** (-10 * (time - 1))) + 2);
        }
    },
    linear: (time) => {
        return time;
    },
    quadIn: (time) => {
        return time * time;
    },
    quadOut: (time) => {
        return -time * (time - 2);
    },
    quadInOut: (time) => {
        time = time * 2;
        if (time < 1) {
            return 0.5 * time * time;
        }
        else {
            time = time - 1;
            return -0.5 * (time * (time - 2) - 1);
        }
    },
    quartIn: (time) => {
        return time * time * time * time;
    },
    quartOut: (time) => {
        time = time - 1;
        return -(time * time * time * time - 1);
    },
    quartInOut: (time) => {
        time = time * 2;
        if (time < 1) {
            return 0.5 * time * time * time * time;
        }
        else {
            time = time - 2;
            return -0.5 * (time * time * time * time - 2);
        }
    },
    quintIn: (time) => {
        return time * time * time * time * time;
    },
    quintOut: (time) => {
        time = time - 1;
        return time * time * time * time * time + 1;
    },
    quintInOut: (time) => {
        time = time * 2;
        if (time < 1) {
            return 0.5 * time * time * time * time * time;
        }
        else {
            time = time - 2;
            return 0.5 * (time * time * time * time * time + 2);
        }
    },
    sineIn: (time) => {
        return -Math.cos(time * (Math.PI / 2)) + 1;
    },
    sineOut: (time) => {
        return Math.sin(time * (Math.PI / 2));
    },
    sineInOut: (time) => {
        return -0.5 * (Math.cos(Math.PI * time) - 1);
    },
    inOut: (time, start, end) => {
        if (time <= 0.5) {
            return start(time * 2) * 0.5;
        }
        else {
            return 0.5 + end((time - 0.5) * 2);
        }
    },
};
//# sourceMappingURL=easing.js.map