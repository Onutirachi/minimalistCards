export default class AudioUtils {
    static makeMono(audioArray) {
        const half = Math.floor(audioArray.length / 2);
        const leftArray = audioArray.slice(0, half);
        const rightArray = audioArray.slice(half);
        const monoArray = [];

        const len = Math.min(leftArray.length, rightArray.length);
        for (let i = 0; i < len; i++) {
            monoArray.push((leftArray[i] + rightArray[i]) / 2);
        }
        return monoArray;
    }

    static extractChannelQuantity(audioArray, channelsQuantity) {
        const delta = audioArray.length / channelsQuantity;
        const channelsArray = [];

        for (let i = 0; i < channelsQuantity; ++i) {
            const chunk = audioArray.slice(i * delta, (i + 1) * delta);
            channelsArray.push(Math.max(...chunk));
        }

        return channelsArray;
    }

    static getRangeMean(audioArray, from, to) {
        var mean = 0;
        for (var i = from; i < to; i++) {
            mean += audioArray[i];
        }

        mean /= to - from;
        return mean;
    }
}
