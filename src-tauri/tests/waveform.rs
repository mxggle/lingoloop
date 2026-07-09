use pawcast_lib::media::waveform::{
    analyze_samples, delete_cache, parse_probe_audio_metadata, read_level, read_meta, write_cache,
    ProbeAudioMetadata, WAVEFORM_LEVEL_SAMPLES,
};

#[test]
fn parses_audio_metadata_and_rejects_silent_video() {
    let metadata = parse_probe_audio_metadata(&serde_json::json!({
        "format": { "duration": "12.5" },
        "streams": [{ "codec_type": "video" }, { "codec_type": "audio", "sample_rate": "48000" }]
    }))
    .unwrap();
    assert_eq!(
        metadata,
        ProbeAudioMetadata {
            duration: 12.5,
            sample_rate: 48_000
        }
    );
    assert!(
        parse_probe_audio_metadata(&serde_json::json!({"streams": [{"codec_type": "video"}]}))
            .is_none()
    );
}

#[test]
fn computes_compatible_min_max_and_rms_peaks() {
    let samples = [-32768_i16, -1000, 1000, 32767];
    let levels = analyze_samples(&samples, &[2, 4]);
    assert_eq!(levels[0].min, vec![-32768, 1000]);
    assert_eq!(levels[0].max, vec![-1000, 32767]);
    assert_eq!(levels[1].min, vec![-32768]);
    assert_eq!(levels[1].max, vec![32767]);
    assert_eq!(levels[1].rms.len(), 1);
    assert_eq!(WAVEFORM_LEVEL_SAMPLES[0], 256);
    assert_eq!(WAVEFORM_LEVEL_SAMPLES.last(), Some(&65_536));
}

#[test]
fn cache_round_trip_validation_and_delete() {
    let temp = tempfile::tempdir().unwrap();
    let levels = analyze_samples(&vec![100_i16; 512], &[256, 512]);
    let meta = write_cache(temp.path(), "media-safe_1", 1.0, 44_100, &levels).unwrap();
    assert_eq!(
        read_meta(temp.path(), "media-safe_1").unwrap(),
        Some(meta.clone())
    );
    let finest = read_level(temp.path(), "media-safe_1", 256)
        .unwrap()
        .unwrap();
    assert_eq!(finest.min, vec![100, 100]);
    assert_eq!(finest.max, vec![100, 100]);
    assert_eq!(finest.rms, vec![100, 100]);
    std::fs::write(temp.path().join("media-safe_1/meta.json"), b"corrupt").unwrap();
    assert!(read_meta(temp.path(), "media-safe_1").unwrap().is_none());
    assert!(!temp.path().join("media-safe_1").exists());
    let _ = write_cache(temp.path(), "media-safe_1", 1.0, 44_100, &levels).unwrap();
    delete_cache(temp.path(), "media-safe_1").unwrap();
    assert!(read_meta(temp.path(), "media-safe_1").unwrap().is_none());
    assert!(write_cache(temp.path(), "../escape", 1.0, 44_100, &levels).is_err());
}
