import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Container, Sprite} from '@inlet/react-pixi';
import * as PIXI from 'pixi.js';

const PIVOT = new PIXI.Point(50, 50);
const POSE_BUFFER_LEN = 3;

class FilterView extends Component {
  state = {
    mask: null,
    ...getBlankPose()
  };

  filter = new PIXI.Texture.fromImage(this.props.image);
  graphics = new PIXI.Graphics();
  poseBuffer = [];
  poseBufferIndex = 0;

  componentDidMount() {
    this._isMounted = true;
    for (let i = 0; i < POSE_BUFFER_LEN; i++) {
      this.poseBuffer.push({
        filterSize: 0,
        filterX: 0,
        filterY: 0,
        faceSpan: 0,
        faceX: 0,
        faceY: 0,
        rotation: 0
      });
    }
    this.updatePose();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  getAveragePose = pose => {
    const filterSize = pose.shoulders.span * 3;

    const filterX =
      pose.shoulders.leftX +
      Math.abs((pose.shoulders.leftX - pose.shoulders.rightX) / 2);
    const filterY =
      pose.shoulders.leftY +
      Math.abs((pose.shoulders.leftY - pose.shoulders.rightY) / 2);

    const faceX =
      pose.ears.leftX + Math.abs((pose.ears.leftX - pose.ears.rightX) / 2);
    const faceY =
      pose.ears.leftY + Math.abs((pose.ears.leftY - pose.ears.rightY) / 2);
    const faceSpan = pose.ears.span * 0.5;

    const rotation = pose.shoulders.angle;

    const newPose = {
      filterSize,
      filterX,
      filterY,
      faceX,
      faceY,
      faceSpan,
      rotation
    };
    this.poseBuffer[this.poseBufferIndex++] = newPose;
    this.poseBufferIndex %= POSE_BUFFER_LEN;

    const avgPose = getBlankPose();
    for (const key of Object.keys(newPose)) {
      for (let i = 0; i < POSE_BUFFER_LEN; i++) {
        avgPose[key] *= i;
        avgPose[key] += this.poseBuffer[i][key];
        avgPose[key] /= i + 1;
      }
    }

    return avgPose;
  };

  updatePose = () => {
    this.props.getPose().then(pose => {
      if (!pose) return requestAnimationFrame(this.updatePose);
      if (!this._isMounted) return;

      const {width, height} = this.props.app.screen;
      const {
        filterSize,
        filterX,
        filterY,
        faceX,
        faceY,
        faceSpan,
        rotation
      } = this.getAveragePose(pose);

      const mask = new PIXI.Graphics()
        .beginFill(0, 0.5)
        .moveTo(0, 0)
        .lineTo(0, height)
        .lineTo(width, height)
        .lineTo(width, 0)
        .lineTo(0, 0)
        .lineTo(faceX, faceY - faceSpan)
        .bezierCurveTo(
          faceX + faceSpan / 2,
          faceY - faceSpan,
          faceX + faceSpan,
          faceY - faceSpan / 2,
          faceX + faceSpan,
          faceY
        )
        .bezierCurveTo(
          faceX + faceSpan,
          faceY + faceSpan / 2,
          faceX + faceSpan / 2,
          faceY + faceSpan,
          faceX,
          faceY + faceSpan
        )
        .bezierCurveTo(
          faceX - faceSpan / 2,
          faceY + faceSpan,
          faceX - faceSpan,
          faceY + faceSpan / 2,
          faceX - faceSpan,
          faceY
        )
        .bezierCurveTo(
          faceX - faceSpan,
          faceY - faceSpan / 2,
          faceX - faceSpan / 2,
          faceY - faceSpan,
          faceX,
          faceY - faceSpan
        )
        .lineTo(0, 0);

      if (this.state.mask) this.state.mask.destroy();

      this.setState({
        filterSize,
        filterX,
        filterY,
        mask,
        rotation,
        pose
      });

      requestAnimationFrame(this.updatePose);
    });
  };

  toImage = () => {
    return this.props.app.renderer.extract.image(this.props.app.stage);
  };

  render() {
    const {filterSize, filterX, filterY, rotation, mask} = this.state;
    return (
      <Container>
        <Sprite
          texture={this.filter}
          x={filterX}
          y={filterY}
          width={filterSize}
          height={filterSize}
          rotation={rotation}
          pivot={PIVOT}
          mask={mask}
        />
      </Container>
    );
  }
}

function getBlankPose() {
  return {
    filterSize: 0,
    filterX: 0,
    filterY: 0,
    rotation: 0,
    faceX: 0,
    faceY: 0,
    faceSpan: 0
  };
}

FilterView.propTypes = {
  app: PropTypes.object.isRequired,
  getPose: PropTypes.func.isRequired,
  image: PropTypes.string.isRequired
};

export default FilterView;